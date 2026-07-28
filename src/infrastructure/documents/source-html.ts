import { importExtensionOf } from "@/domain/documents/import-file";

/**
 * Every accepted source file, as HTML (PLAN.md STEP 5).
 *
 * One target on purpose: whatever a user brings in becomes HTML here, and a
 * single parser turns that into a document. Markdown goes through `marked`,
 * .docx through `mammoth` (its HTML output keeps tables, its markdown output
 * does not), plain text is wrapped as paragraphs. Both libraries load lazily —
 * an instance that never imports a .docx never pays for `mammoth`.
 *
 * The conversion is faithful: it carries structure over, it does not beautify.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain text: blank lines separate paragraphs, single newlines are breaks.
 * Nothing is interpreted — a `#` in a .txt file is a `#`, not a heading. */
export function textToHtml(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function markdownToHtml(source: string): Promise<string> {
  const { marked } = await import("marked");
  return marked.parse(source, { async: false, gfm: true });
}

/** HTML for an uploaded file, chosen by extension. */
export async function htmlFromFile(
  filename: string,
  buffer: ArrayBuffer,
): Promise<string> {
  const extension = importExtensionOf(filename);
  if (extension === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(buffer) });
    return value;
  }
  const source = new TextDecoder("utf-8").decode(buffer);
  if (extension === ".txt") return textToHtml(source);
  return markdownToHtml(source);
}
