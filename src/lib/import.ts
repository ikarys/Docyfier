import "server-only";
import type { JSONContent } from "@tiptap/core";
import {
  IMPORT_EXTENSIONS,
  MAX_IMPORT_BYTES,
  importExtensionOf,
  titleFromFilename,
} from "@/domain/documents/import-file";
import { parseHtmlBody } from "@/infrastructure/documents/html-body-parser";
import { htmlFromFile, markdownToHtml } from "@/infrastructure/documents/source-html";
import { editorSchema, validateDocJson } from "@/infrastructure/editor/schema";

/**
 * Composition root for document import (PLAN.md STEP 5): bring an existing file
 * in so it can be reworked and reformatted in the editor.
 *
 * The adapters convert a source to HTML and HTML to document JSON; this is the
 * one module that decides what schema they are read with, and that the result
 * goes through the same validation as AI output. Actions call these and never
 * name a conversion library.
 */

export { titleFromFilename };

/** Convert HTML into document JSON using the editor's schema. */
export async function docFromHtml(html: string): Promise<JSONContent> {
  return validateDocJson(await parseHtmlBody(html, editorSchema));
}

/** Document JSON for a markdown source — the same path an imported `.md` takes,
 * offered on its own for text that never was a file (a composer's answer). */
export async function docFromMarkdown(source: string): Promise<JSONContent> {
  return docFromHtml(await markdownToHtml(source));
}

/**
 * Document JSON for an uploaded file. Throws a message meant for the user when
 * the file cannot be imported.
 */
export async function docFromFile(file: File): Promise<JSONContent> {
  if (!importExtensionOf(file.name)) {
    throw new Error(`Unsupported file type. Import ${IMPORT_EXTENSIONS.join(", ")}.`);
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`File is too large (max ${MAX_IMPORT_BYTES / 1024 / 1024} MB).`);
  }
  return docFromHtml(await htmlFromFile(file.name, await file.arrayBuffer()));
}
