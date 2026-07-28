import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StoredCredentials } from "@/domain/access/credentials";
import { FileCredentialsRepository } from "./file-credentials-repository";

/**
 * An adapter over files cannot be proved against anything but files, so this one
 * uses a temporary directory and removes it. What it has to get right is the
 * on-disk shape: instances already have an `auth.json`, and this must keep
 * reading it.
 */

let dir: string;
let repository: FileCredentialsRepository;

const credentials: StoredCredentials = {
  salt: "aabb",
  hash: "ccdd",
  sessionKey: "eeff",
  updatedAt: "2026-07-28T12:00:00.000Z",
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "docyfier-access-"));
  repository = FileCredentialsRepository.beside(path.join(dir, "documents"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileCredentialsRepository", () => {
  it("reads back what it wrote", async () => {
    await repository.save(credentials);

    expect(await repository.load()).toEqual(credentials);
  });

  it("reports no credentials on an instance that has none", async () => {
    expect(await repository.load()).toBeNull();
  });

  it("keeps them beside the document directory, not inside it", async () => {
    await repository.save(credentials);

    await expect(stat(path.join(dir, "auth.json"))).resolves.toBeDefined();
  });

  /** The file holds the password hash and the session key: nobody else on the
   * machine gets to read it. */
  it("writes the file readable by its owner alone", async () => {
    await repository.save(credentials);

    const mode = (await stat(path.join(dir, "auth.json"))).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("stores the session key under the name instances already have on disk", async () => {
    await repository.save(credentials);

    const raw = JSON.parse(await readFile(path.join(dir, "auth.json"), "utf8"));
    expect(raw.secret).toBe("eeff");
    expect(raw).not.toHaveProperty("sessionKey");
  });

  it("reads an auth.json written before this adapter existed", async () => {
    await writeFile(
      path.join(dir, "auth.json"),
      JSON.stringify({ salt: "11", hash: "22", secret: "33", updatedAt: "2025-01-01" }),
    );

    expect(await repository.load()).toEqual({
      salt: "11",
      hash: "22",
      sessionKey: "33",
      updatedAt: "2025-01-01",
    });
  });

  /** A half-written file must not read as credentials: the instance would then
   * demand a password it cannot verify. */
  it("treats an incomplete file as no credentials", async () => {
    const file = path.join(dir, "auth.json");

    await writeFile(file, JSON.stringify({ salt: "11", hash: "22" }));
    expect(await repository.load()).toBeNull();

    await writeFile(file, JSON.stringify({ hash: "22", secret: "33" }));
    expect(await repository.load()).toBeNull();
  });

  it("treats an unparseable file as no credentials", async () => {
    await writeFile(path.join(dir, "auth.json"), "{ not json");

    expect(await repository.load()).toBeNull();
  });

  it("creates the directory it writes into", async () => {
    const nested = FileCredentialsRepository.beside(
      path.join(dir, "deeper", "still", "documents"),
    );
    await nested.save(credentials);

    expect(await nested.load()).toEqual(credentials);
  });

  it("replaces the credentials on a rotation rather than merging them", async () => {
    await repository.save(credentials);
    await repository.save({ ...credentials, sessionKey: "9999", hash: "8888" });

    const loaded = await repository.load();
    expect(loaded?.sessionKey).toBe("9999");
    expect(loaded?.hash).toBe("8888");
  });
});
