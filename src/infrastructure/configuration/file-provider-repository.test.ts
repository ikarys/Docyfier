import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { describeProviderRepository } from "@test/contracts/provider-repository";
import { ProviderCatalog } from "@/domain/configuration/provider-catalog";
import { AiProvider } from "@/domain/configuration/ai-provider";
import { aesGcmCipher, clearSecretKeyCache } from "./aes-gcm-cipher";
import { FileProviderRepository } from "./file-provider-repository";

/**
 * The file adapter against a real settings file — an adapter over files cannot
 * be proven against anything else. Each run gets its own temporary directory
 * and its own encryption key; nothing reads or writes the data volume.
 */

const KEY = "a".repeat(64);

async function useTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "docyfier-config-"));
  process.env.DOCYFIER_DATA_DIR = path.join(dir, "documents");
  process.env.DOCYFIER_SECRET_KEY = KEY;
  clearSecretKeyCache();
  return dir;
}

async function cleanUp(dir: string): Promise<void> {
  delete process.env.DOCYFIER_DATA_DIR;
  delete process.env.DOCYFIER_SECRET_KEY;
  delete process.env.DOCYFIER_LLM_BASE_URL;
  clearSecretKeyCache();
  await rm(dir, { recursive: true, force: true });
}

function settingsPath(dir: string): string {
  return path.join(dir, "settings.json");
}

async function writeSettings(dir: string, content: object): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(dir), JSON.stringify(content), "utf8");
}

describeProviderRepository("FileProviderRepository", async () => {
  const dir = await useTempDir();
  return {
    repository: new FileProviderRepository(aesGcmCipher),
    dispose: () => cleanUp(dir),
  };
});

describe("FileProviderRepository", () => {
  let dir: string;
  afterEach(async () => cleanUp(dir));

  const repository = () => new FileProviderRepository(aesGcmCipher);

  it("never writes a key in clear, whatever the caller handed it", async () => {
    dir = await useTempDir();
    await repository().save(
      ProviderCatalog.of(
        [
          AiProvider.create({
            id: "a",
            label: "Hosted",
            baseUrl: "https://api.example.com/v1",
            model: "",
            apiKey: "sk-live-secret",
            maxOutputTokens: 4096,
            structuredOutput: false,
reasoningEffort: "default",
          }),
        ],
        "a",
      ),
    );

    const written = await readFile(settingsPath(dir), "utf8");
    expect(written).not.toContain("sk-live-secret");
    expect(written).toContain("v1.");
  });

  it("reads the pre-multi-provider layout as the one provider it described", async () => {
    dir = await useTempDir();
    await writeSettings(dir, {
      baseUrl: "http://legacy:9999/v1",
      model: "legacy-model",
      apiKey: "sk-written-before-encryption",
      maxOutputTokens: 1234,
      storage: { driver: "files" },
    });

    const active = (await repository().load()).active;
    expect(active.baseUrl).toBe("http://legacy:9999/v1");
    expect(active.model).toBe("legacy-model");
    expect(active.apiKey).toBe("sk-written-before-encryption");
    expect(active.maxOutputTokens).toBe(1234);
  });

  it("migrates that layout on the next save, and leaves the other scopes alone", async () => {
    dir = await useTempDir();
    await writeSettings(dir, {
      baseUrl: "http://legacy:9999/v1",
      storage: { driver: "postgres" },
    });

    await repository().save(await repository().load());

    const written = JSON.parse(await readFile(settingsPath(dir), "utf8"));
    expect(written.baseUrl).toBeUndefined();
    expect(written.ai.providers[0].baseUrl).toBe("http://legacy:9999/v1");
    expect(written.storage.driver).toBe("postgres");
  });

  it("says a key is unreadable when the encryption key rotated, and still loads", async () => {
    dir = await useTempDir();
    await repository().save(
      ProviderCatalog.of(
        [
          AiProvider.create({
            id: "a",
            label: "Hosted",
            baseUrl: "https://api.example.com/v1",
            model: "",
            apiKey: "sk-live-secret",
            maxOutputTokens: 4096,
            structuredOutput: false,
reasoningEffort: "default",
          }),
        ],
        "a",
      ),
    );

    process.env.DOCYFIER_SECRET_KEY = "b".repeat(64);
    clearSecretKeyCache();

    const active = (await repository().load()).active;
    expect(active.keyUnreadable).toBe(true);
    expect(active.apiKey).toBe("");
  });

  it("takes the environment as the default provider of a fresh instance", async () => {
    dir = await useTempDir();
    process.env.DOCYFIER_LLM_BASE_URL = "http://from-env:1111/v1";

    expect((await repository().load()).active.baseUrl).toBe("http://from-env:1111/v1");
  });
});
