import "server-only";
import { mkdir, readFile, readdir, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { DocumentRecord } from "@/domain/documents/document";
import type { DocumentRepository, DocumentSummary } from "@/domain/documents/repository";

/**
 * File-backed driver: one JSON file per document under `DOCYFIER_DATA_DIR`.
 * The default backend, and the only one that needs no external service.
 */

export function dataDir(): string {
  return process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
}

async function ensureDir(): Promise<string> {
  const dir = dataDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

function filePath(dir: string, id: string): string {
  return path.join(dir, `${id}.json`);
}

/** Ids reach the filesystem as path segments, so anything but the generated
 * shape is refused rather than escaped. */
function isSafeId(id: string): boolean {
  return /^[a-zA-Z0-9-]+$/.test(id);
}

export const fileDocumentRepository: DocumentRepository = {
  async list(): Promise<DocumentSummary[]> {
    const dir = await ensureDir();
    const entries = await readdir(dir, { withFileTypes: true });
    const docs = await Promise.all(
      entries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map(async (e) => {
          const raw = await readFile(path.join(dir, e.name), "utf8");
          const doc = JSON.parse(raw) as DocumentRecord;
          return { id: doc.id, title: doc.title, updatedAt: doc.updatedAt };
        }),
    );
    return docs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id: string): Promise<DocumentRecord | null> {
    if (!isSafeId(id)) return null;
    const dir = await ensureDir();
    try {
      const raw = await readFile(filePath(dir, id), "utf8");
      return JSON.parse(raw) as DocumentRecord;
    } catch {
      return null;
    }
  },

  /** Write via a temp file + rename so an interrupted save can never leave a
   * half-written document on disk (autosave writes often, including on unload). */
  async put(doc: DocumentRecord): Promise<void> {
    const dir = await ensureDir();
    const target = filePath(dir, doc.id);
    const tmp = `${target}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
    await rename(tmp, target);
  },

  async remove(id: string): Promise<void> {
    if (!isSafeId(id)) return;
    const dir = await ensureDir();
    await unlink(filePath(dir, id)).catch(() => {});
  },
};
