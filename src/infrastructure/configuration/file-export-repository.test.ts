import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ExportConfiguration } from "@/domain/publishing/export-configuration";
import { aesGcmCipher, clearSecretKeyCache } from "./aes-gcm-cipher";
import { FileExportRepository } from "./file-export-repository";

/**
 * The export adapter against a real settings file. Each run gets its own
 * temporary directory and encryption key; nothing touches the data volume.
 */

const secretIds = { confluence: ["token"] };

let dir: string;

async function useTempDir(): Promise<void> {
  dir = await mkdtemp(path.join(tmpdir(), "docyfier-exports-"));
  process.env.DOCYFIER_DATA_DIR = path.join(dir, "documents");
  process.env.DOCYFIER_SECRET_KEY = "a".repeat(64);
  clearSecretKeyCache();
}

afterEach(async () => {
  delete process.env.DOCYFIER_DATA_DIR;
  delete process.env.DOCYFIER_SECRET_KEY;
  delete process.env.DOCYFIER_EXPORTS;
  clearSecretKeyCache();
  await rm(dir, { recursive: true, force: true });
});

const repository = () => new FileExportRepository(aesGcmCipher);

const configured = () =>
  ExportConfiguration.restore(
    { confluence: { enabled: true, options: { token: "sk-live", space: "DOC" } } },
    "https://docs.example.com",
    [],
  );

describe("FileExportRepository", () => {
  it("gives back the configuration it was given, credentials usable", async () => {
    await useTempDir();
    await repository().save(configured(), secretIds);

    const loaded = await repository().load();
    expect(loaded.optionsFor("confluence")).toEqual({ token: "sk-live", space: "DOC" });
    expect(loaded.publicBaseUrl).toBe("https://docs.example.com");
  });

  it("encrypts the credential options and nothing else", async () => {
    await useTempDir();
    await repository().save(configured(), secretIds);

    const written = await readFile(path.join(dir, "settings.json"), "utf8");
    expect(written).not.toContain("sk-live");
    expect(written).toContain("DOC");
  });

  it("turns on the targets the deployment enabled", async () => {
    await useTempDir();
    process.env.DOCYFIER_EXPORTS = "notion";

    expect((await repository().load()).isEnabled("notion")).toBe(true);
  });
});
