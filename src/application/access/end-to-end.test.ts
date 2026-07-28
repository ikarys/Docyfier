import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { scrypt as scryptCallback, randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LoginAttempts, type AttemptLog } from "@/domain/access/login-attempts";
import type { AccessEnvironment } from "@/domain/access/credentials";
import { processEnvironment } from "@/infrastructure/access/environment";
import { FileCredentialsRepository } from "@/infrastructure/access/file-credentials-repository";
import { hmacSessionSigning } from "@/infrastructure/access/hmac-session-signing";
import { randomSessionKeys } from "@/infrastructure/access/random-session-keys";
import { scryptHasher } from "@/infrastructure/access/scrypt-hasher";
import { systemClock } from "@/infrastructure/shared/system-clock";
import type { AccessDeps } from "./deps";
import { checkPassword, choosePassword } from "./authenticate";
import { openSession, sessionIsValid } from "./sessions";

/**
 * The whole of access, wired the way the app wires it: real scrypt, real HMAC,
 * a real file. The fakes elsewhere prove the rules; this proves the adapters
 * behind them agree with each other — including with the `auth.json` instances
 * already have on disk, which no unit test can vouch for.
 *
 * Only the process-wide attempt counter is replaced, so one test's failures do
 * not lock another one out.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const PASSWORD = "un-mot-de-passe-correct";

let dir: string;

class LocalAttempts implements AttemptLog {
  private attempts = LoginAttempts.fresh();
  read = () => this.attempts;
  write = (next: LoginAttempts) => {
    this.attempts = next;
  };
}

function deps(environment: AccessEnvironment = emptyEnvironment): AccessDeps {
  return {
    credentials: FileCredentialsRepository.beside(path.join(dir, "documents")),
    hasher: scryptHasher,
    signing: hmacSessionSigning,
    keys: randomSessionKeys,
    attempts: new LocalAttempts(),
    clock: systemClock,
    environment,
  };
}

const emptyEnvironment: AccessEnvironment = {
  password: () => null,
  sessionKey: () => null,
  accessFlag: () => undefined,
};

/** An `auth.json` in the shape the previous implementation wrote. */
async function writeLegacyAuthFile(password: string): Promise<void> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  await writeFile(
    path.join(dir, "auth.json"),
    JSON.stringify({
      salt: salt.toString("hex"),
      hash: hash.toString("hex"),
      secret: randomBytes(32).toString("hex"),
      updatedAt: "2025-01-01T00:00:00.000Z",
    }),
  );
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "docyfier-access-e2e-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("choosing a password and using it", () => {
  it("logs in with the password that was chosen, and with nothing else", async () => {
    const access = deps();
    await choosePassword(access, PASSWORD);

    expect(await checkPassword(access, PASSWORD)).toBe("ok");
    expect(await checkPassword(access, `${PASSWORD}!`)).toBe("invalid");
  });

  it("opens a session the same instance accepts back", async () => {
    const access = deps();
    await choosePassword(access, PASSWORD);

    const { cookieValue } = await openSession(access);

    expect(await sessionIsValid(access, cookieValue)).toBe(true);
  });

  it("survives a restart: the key is on disk, not in the process", async () => {
    await choosePassword(deps(), PASSWORD);
    const { cookieValue } = await openSession(deps());

    expect(await sessionIsValid(deps(), cookieValue)).toBe(true);
  });

  it("ends every session when the password is set again", async () => {
    await choosePassword(deps(), PASSWORD);
    const { cookieValue } = await openSession(deps());

    await choosePassword(deps(), PASSWORD);

    expect(await sessionIsValid(deps(), cookieValue)).toBe(false);
  });
});

describe("an instance that already had credentials", () => {
  it("still logs in from an auth.json written before this rewrite", async () => {
    await writeLegacyAuthFile(PASSWORD);
    const access = deps();

    expect(await checkPassword(access, PASSWORD)).toBe("ok");
    expect(await checkPassword(access, "autre-chose-encore")).toBe("invalid");
  });

  it("keeps signing sessions with the key that file already holds", async () => {
    await writeLegacyAuthFile(PASSWORD);

    const { cookieValue } = await openSession(deps());

    expect(await sessionIsValid(deps(), cookieValue)).toBe(true);
  });
});

describe("an instance configured by the environment alone", () => {
  const environment: AccessEnvironment = {
    password: () => "deployment-password",
    sessionKey: () => null,
    accessFlag: () => undefined,
  };

  it("logs in without ever writing a file", async () => {
    expect(await checkPassword(deps(environment), "deployment-password")).toBe("ok");
    expect(await deps(environment).credentials.load()).toBeNull();
  });

  it("keeps its sessions across a restart, having nothing to store", async () => {
    const { cookieValue } = await openSession(deps(environment));

    expect(await sessionIsValid(deps(environment), cookieValue)).toBe(true);
  });
});

describe("the environment adapter", () => {
  it("reads an unset variable as unset, and an empty one too", () => {
    const before = process.env.DOCYFIER_AUTH_PASSWORD;
    try {
      delete process.env.DOCYFIER_AUTH_PASSWORD;
      expect(processEnvironment.password()).toBeNull();

      process.env.DOCYFIER_AUTH_PASSWORD = "";
      expect(processEnvironment.password()).toBeNull();

      process.env.DOCYFIER_AUTH_PASSWORD = "set";
      expect(processEnvironment.password()).toBe("set");
    } finally {
      if (before === undefined) delete process.env.DOCYFIER_AUTH_PASSWORD;
      else process.env.DOCYFIER_AUTH_PASSWORD = before;
    }
  });
});
