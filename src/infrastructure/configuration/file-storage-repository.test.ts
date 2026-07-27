import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { StorageConnection } from "@/domain/configuration/storage-connection";
import { aesGcmCipher, clearSecretKeyCache } from "./aes-gcm-cipher";
import { FileStorageRepository } from "./file-storage-repository";

/**
 * The connection adapter against a real settings file. Each run gets its own
 * temporary directory and encryption key; nothing touches the data volume.
 */

const database = {
  driver: "postgres" as const,
  host: "db.example.com",
  port: 5432,
  user: "docyfier",
  password: "hunter2",
  database: "docs",
  ssl: true,
};

let dir: string;

async function useTempDir(): Promise<void> {
  dir = await mkdtemp(path.join(tmpdir(), "docyfier-storage-"));
  process.env.DOCYFIER_DATA_DIR = path.join(dir, "documents");
  process.env.DOCYFIER_SECRET_KEY = "a".repeat(64);
  clearSecretKeyCache();
}

afterEach(async () => {
  delete process.env.DOCYFIER_DATA_DIR;
  delete process.env.DOCYFIER_SECRET_KEY;
  delete process.env.DOCYFIER_DB_DRIVER;
  clearSecretKeyCache();
  await rm(dir, { recursive: true, force: true });
});

const repository = () => new FileStorageRepository(aesGcmCipher);

describe("FileStorageRepository", () => {
  it("gives back the connection it was given, password usable", async () => {
    await useTempDir();
    await repository().save(StorageConnection.create(database));

    expect((await repository().load()).toRecord()).toEqual(database);
  });

  it("never writes the password in clear", async () => {
    await useTempDir();
    await repository().save(StorageConnection.create(database));

    const written = await readFile(path.join(dir, "settings.json"), "utf8");
    expect(written).not.toContain("hunter2");
  });

  it("starts from the environment while nothing is configured", async () => {
    await useTempDir();
    process.env.DOCYFIER_DB_DRIVER = "mysql";

    expect((await repository().load()).driver).toBe("mysql");
  });
});
