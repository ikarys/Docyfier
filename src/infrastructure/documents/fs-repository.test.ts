import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { describeDocumentRepository } from "@test/contracts/document-repository";
import { dataDir, fileDocumentRepository } from "./fs-repository";

/**
 * The one suite here that touches a real filesystem — an adapter over files
 * cannot be proven against anything else. Each run gets its own temporary
 * directory and removes it afterwards; nothing reads or writes the data volume.
 */
async function useTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "docyfier-test-"));
  process.env.DOCYFIER_DATA_DIR = path.join(dir, "documents");
  return dir;
}

describeDocumentRepository("fileDocumentRepository", async () => {
  const dir = await useTempDir();
  return {
    repository: fileDocumentRepository,
    dispose: async () => {
      delete process.env.DOCYFIER_DATA_DIR;
      await rm(dir, { recursive: true, force: true });
    },
  };
});

describe("fileDocumentRepository", () => {
  /** Ids reach the filesystem as path segments. */
  it("refuses an id that is not the generated shape rather than escaping it", async () => {
    await useTempDir();
    await fileDocumentRepository.put({
      id: "safe-id",
      title: "Rapport",
      content: { type: "doc", content: [{ type: "paragraph" }] },
      theme: { preset: "editorial" },
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });

    expect(await fileDocumentRepository.get("../../etc/passwd")).toBeNull();
    expect(await fileDocumentRepository.get("a/b")).toBeNull();
    expect(await fileDocumentRepository.get("a.json")).toBeNull();

    // A traversal must not be able to delete anything either.
    await fileDocumentRepository.remove("../safe-id");
    expect(await fileDocumentRepository.get("safe-id")).not.toBeNull();
  });
});

describe("dataDir", () => {
  it("follows the configured data directory", () => {
    process.env.DOCYFIER_DATA_DIR = "/srv/docyfier/documents";
    expect(dataDir()).toBe("/srv/docyfier/documents");
  });

  it("falls back to the project's own data folder", () => {
    delete process.env.DOCYFIER_DATA_DIR;
    expect(dataDir()).toBe(path.join(process.cwd(), "data", "documents"));
  });
});
