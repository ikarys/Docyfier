import "server-only";
import { mkdir, readFile, readdir, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { JSONContent } from "@tiptap/react";
import { DEFAULT_PRESET, normalizeTheme, type DocumentTheme } from "@/lib/themes";

/**
 * File-backed document store. Documents are ProseMirror JSON — the product's
 * internal format (see PLAN.md STEP 0). This fs store stands in for the database
 * that arrives in a later STEP; the on-disk shape is deliberately DB-shaped.
 */

export interface DocumentRecord {
  id: string;
  title: string;
  content: JSONContent;
  /** Presentation theme (see src/lib/themes.ts). Content stays untouched.
   * Documents written before STEP U3 hold a bare preset id; `normalizeTheme`
   * upgrades them on read. */
  theme: DocumentTheme;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
}

function dataDir(): string {
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

/** Write via a temp file + rename so an interrupted save can never leave a
 * half-written document on disk (autosave writes often, including on unload). */
async function writeRecord(dir: string, doc: DocumentRecord): Promise<void> {
  const target = filePath(dir, doc.id);
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(doc, null, 2), "utf8");
  await rename(tmp, target);
}

/** A document is empty of typed text but always has a valid doc shape. */
export function emptyContent(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** Derive a display title from the first heading, else the first text, else Untitled. */
export function deriveTitle(content: JSONContent): string {
  const heading = content.content?.find((n) => n.type === "heading");
  const fromHeading = heading && collectText(heading).trim();
  if (fromHeading) return fromHeading;
  const firstText = content.content?.map(collectText).find((t) => t.trim());
  return firstText?.trim().slice(0, 80) || "Untitled document";
}

function collectText(node: JSONContent): string {
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(collectText).join("");
  return "";
}

export async function listDocuments(): Promise<DocumentSummary[]> {
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
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return null;
  const dir = await ensureDir();
  try {
    const raw = await readFile(filePath(dir, id), "utf8");
    const doc = JSON.parse(raw) as DocumentRecord;
    // Older documents predate themes, or store the pre-U3 string form: both
    // normalize to a full DocumentTheme here, never at the render site.
    doc.theme = normalizeTheme(doc.theme);
    return doc;
  } catch {
    return null;
  }
}

export async function createDocument(
  content: JSONContent = emptyContent(),
): Promise<DocumentRecord> {
  const dir = await ensureDir();
  const now = new Date().toISOString();
  const doc: DocumentRecord = {
    id: randomUUID(),
    title: deriveTitle(content),
    content,
    theme: { preset: DEFAULT_PRESET },
    createdAt: now,
    updatedAt: now,
  };
  await writeRecord(dir, doc);
  return doc;
}

export async function updateDocument(
  id: string,
  content: JSONContent,
): Promise<DocumentRecord | null> {
  const existing = await getDocument(id);
  if (!existing) return null;
  const dir = await ensureDir();
  const updated: DocumentRecord = {
    ...existing,
    content,
    title: deriveTitle(content),
    updatedAt: new Date().toISOString(),
  };
  await writeRecord(dir, updated);
  return updated;
}

/** Update only the presentation theme, leaving content untouched. */
export async function setDocumentTheme(
  id: string,
  theme: unknown,
): Promise<DocumentRecord | null> {
  const existing = await getDocument(id);
  if (!existing) return null;
  const dir = await ensureDir();
  const updated: DocumentRecord = {
    ...existing,
    theme: normalizeTheme(theme),
    updatedAt: new Date().toISOString(),
  };
  await writeRecord(dir, updated);
  return updated;
}

export async function deleteDocument(id: string): Promise<void> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) return;
  const dir = await ensureDir();
  await unlink(filePath(dir, id)).catch(() => {});
}
