import "server-only";
import type { JSONContent } from "@tiptap/core";
import { DOMParser as PMDOMParser } from "@tiptap/pm/model";
import { editorSchema, validateDocJson } from "@/lib/ai/doc-schema";
import {
  IMPORT_EXTENSIONS,
  MAX_IMPORT_BYTES,
  importExtensionOf,
  titleFromFilename,
} from "./import-types";

/**
 * Document import (PLAN.md STEP 5): bring an existing file in so it can be
 * reworked and reformatted in the editor.
 *
 * Everything converges on ONE path — source → HTML → ProseMirror JSON parsed
 * with the editor's own schema — so every format lands on the same node types
 * and inherits the schema's parse rules for free. Markdown goes through
 * `marked`, .docx through `mammoth` (its HTML output keeps tables, its markdown
 * output does not), plain text is wrapped as paragraphs.
 *
 * The import is faithful: it converts structure, it does not beautify. The AI
 * "make it pretty" pass in the editor is what upgrades an imported document.
 */

export { titleFromFilename };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain text: blank lines separate paragraphs, single newlines are breaks.
 * Nothing is interpreted — a `#` in a .txt file is a `#`, not a heading. */
function textToHtml(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Drop what must never reach a document: images (their `src` would point at a
 * file this instance does not serve — same rule the AI contract enforces),
 * and anything executable or presentational carried by the source file.
 */
function stripUnsupportedHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<input[^>]*>/gi, "");
}

/** The editor offers levels 1-3; deeper headings from the source collapse
 * onto 3 rather than rendering as an unstyled outlier. */
function clampHeadings(node: JSONContent): JSONContent {
  if (node.type === "heading" && typeof node.attrs?.level === "number") {
    node.attrs.level = Math.min(3, Math.max(1, node.attrs.level));
  }
  node.content?.forEach(clampHeadings);
  return node;
}

async function htmlFromFile(
  filename: string,
  buffer: ArrayBuffer,
): Promise<string> {
  const extension = importExtensionOf(filename);
  if (extension === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({
      buffer: Buffer.from(buffer),
    });
    return value;
  }
  const source = new TextDecoder("utf-8").decode(buffer);
  if (extension === ".txt") return textToHtml(source);
  const { marked } = await import("marked");
  return marked.parse(source, { async: false, gfm: true });
}

/** Convert HTML into document JSON using the editor's schema. */
export async function docFromHtml(html: string): Promise<JSONContent> {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML(`<html><body>${stripUnsupportedHtml(html)}</body></html>`);
  const node = PMDOMParser.fromSchema(editorSchema).parse(
    document.body as unknown as HTMLElement,
  );
  const json = clampHeadings(node.toJSON() as JSONContent);
  // A file with no convertible content still has to open on something the
  // editor can put a caret in.
  if (!json.content?.length) return { type: "doc", content: [{ type: "paragraph" }] };
  return validateDocJson(json);
}

/**
 * Document JSON for an uploaded file. Throws a message meant for the user when
 * the file cannot be imported.
 */
export async function docFromFile(file: File): Promise<JSONContent> {
  if (!importExtensionOf(file.name)) {
    throw new Error(
      `Unsupported file type. Import ${IMPORT_EXTENSIONS.join(", ")}.`,
    );
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(`File is too large (max ${MAX_IMPORT_BYTES / 1024 / 1024} MB).`);
  }
  const html = await htmlFromFile(file.name, await file.arrayBuffer());
  return docFromHtml(html);
}
