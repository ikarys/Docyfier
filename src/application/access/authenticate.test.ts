import { describe, expect, it } from "vitest";
import { LOCKOUT_MS, MAX_ATTEMPTS } from "@/domain/access/login-attempts";
import { MIN_PASSWORD_LENGTH, WeakPassword } from "@/domain/access/password";
import {
  accessFakes,
  digestOf,
  FakeEnvironment,
  type AccessFakes,
} from "../../../test/fakes/access-deps";
import {
  accessRequired,
  checkPassword,
  choosePassword,
  credentialsExist,
} from "./authenticate";

/**
 * Deciding whether a password is the one. Everything the login form can do
 * is here: the first run that chooses a password, the attempt that is refused,
 * and the lockout that stops the eighth guess from being followed by a ninth.
 */

const GOOD = "un-mot-de-passe-correct";

function withStored(password = GOOD): AccessFakes {
  return accessFakes({
    stored: { ...digestOf(password), sessionKey: "stored-key", updatedAt: "2026-01-01" },
  });
}

describe("credentialsExist", () => {
  it("is false on an instance nobody has configured", async () => {
    expect(await credentialsExist(accessFakes())).toBe(false);
  });

  it("is true once a password was chosen", async () => {
    expect(await credentialsExist(withStored())).toBe(true);
  });

  it("is true when the deployment set one, with nothing on disk", async () => {
    const deps = accessFakes({ environment: new FakeEnvironment({ password: GOOD }) });

    expect(await credentialsExist(deps)).toBe(true);
  });
});

describe("accessRequired", () => {
  it("leaves a fresh local instance open", async () => {
    expect(await accessRequired(accessFakes())).toBe(false);
  });

  it("asks for the password once one exists", async () => {
    expect(await accessRequired(withStored())).toBe(true);
  });

  it("obeys a deployment that turns it off despite a stored password", async () => {
    const deps = accessFakes({
      stored: { ...digestOf(GOOD), sessionKey: "k", updatedAt: "2026-01-01" },
      environment: new FakeEnvironment({ accessFlag: "0" }),
    });

    expect(await accessRequired(deps)).toBe(false);
  });
});

describe("choosePassword", () => {
  it("stores the password as a digest, never as itself", async () => {
    const deps = accessFakes();
    await choosePassword(deps, GOOD);

    const stored = deps.credentials.current;
    expect(stored).not.toBeNull();
    expect(JSON.stringify(stored)).not.toContain(GOOD);
  });

  it("refuses a password shorter than the minimum", async () => {
    const deps = accessFakes();

    await expect(choosePassword(deps, "a".repeat(MIN_PASSWORD_LENGTH - 1))).rejects.toThrow(
      WeakPassword,
    );
    expect(deps.credentials.current).toBeNull();
  });

  it("timestamps the change from the injected clock", async () => {
    const deps = accessFakes({ at: Date.UTC(2026, 0, 2, 3, 4, 5) });
    await choosePassword(deps, GOOD);

    expect(deps.credentials.current?.updatedAt).toBe("2026-01-02T03:04:05.000Z");
  });

  /** Rotating the password has to end the sessions it used to authorise. */
  it("issues a new session key, so every existing session dies with the old password", async () => {
    const deps = withStored();
    await choosePassword(deps, GOOD);

    expect(deps.credentials.current?.sessionKey).not.toBe("stored-key");
  });

  it("lifts a lockout, since the operator just proved they own the instance", async () => {
    const deps = withStored();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await checkPassword(deps, "wrong");
    expect(await checkPassword(deps, GOOD)).toBe("locked");

    await choosePassword(deps, GOOD);

    expect(await checkPassword(deps, GOOD)).toBe("ok");
  });
});

describe("checkPassword", () => {
  it("accepts the stored password", async () => {
    expect(await checkPassword(withStored(), GOOD)).toBe("ok");
  });

  it("refuses any other", async () => {
    expect(await checkPassword(withStored(), "autre-chose-encore")).toBe("invalid");
  });

  it("accepts the one the deployment set, without reading a file", async () => {
    const deps = accessFakes({ environment: new FakeEnvironment({ password: GOOD }) });

    expect(await checkPassword(deps, GOOD)).toBe("ok");
    expect(await checkPassword(deps, "autre-chose-encore")).toBe("invalid");
  });

  /** A deployment must be able to override a password left on disk. */
  it("lets the deployment's password win over the stored one", async () => {
    const deps = accessFakes({
      stored: { ...digestOf("le-mot-de-passe-du-fichier"), sessionKey: "k", updatedAt: "x" },
      environment: new FakeEnvironment({ password: GOOD }),
    });

    expect(await checkPassword(deps, GOOD)).toBe("ok");
    expect(await checkPassword(deps, "le-mot-de-passe-du-fichier")).toBe("invalid");
  });

  it("says so when there is nothing to check against", async () => {
    expect(await checkPassword(accessFakes(), GOOD)).toBe("unconfigured");
  });

  it("locks the instance on the failure that reaches the limit", async () => {
    const deps = withStored();
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      expect(await checkPassword(deps, "wrong")).toBe("invalid");
    }

    expect(await checkPassword(deps, "wrong")).toBe("invalid");
    expect(await checkPassword(deps, "wrong")).toBe("locked");
  });

  /** The point of the lockout: the right password does not get you in either,
   * so guessing cannot be parallelised against a correct guess. */
  it("refuses the correct password while locked", async () => {
    const deps = withStored();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await checkPassword(deps, "wrong");

    expect(await checkPassword(deps, GOOD)).toBe("locked");
  });

  it("answers again once the lockout has run out", async () => {
    const deps = withStored();
    for (let i = 0; i < MAX_ATTEMPTS; i++) await checkPassword(deps, "wrong");

    deps.clock.advanceBy(LOCKOUT_MS);

    expect(await checkPassword(deps, GOOD)).toBe("ok");
  });

  it("forgets the failures after a success, so eight spread-out typos cost nothing", async () => {
    const deps = withStored();
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await checkPassword(deps, "wrong");
    await checkPassword(deps, GOOD);
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await checkPassword(deps, "wrong");

    expect(await checkPassword(deps, GOOD)).toBe("ok");
  });
});
