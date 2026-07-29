/**
 * What a pasted string actually is (PLAN.md STEP U8).
 *
 * The browser hands plain text over as one blob; a spreadsheet range and a
 * markdown snippet both arrive that way and both deserve better than a wall of
 * characters. This module decides, and decides only: inserting is the editor's
 * job, so the rule stays testable without a DOM.
 *
 * It only ever runs when the clipboard carries no HTML of its own — when it
 * does, ProseMirror's own parsing is the better answer.
 */

export type PasteDecision =
  | { readonly kind: "table"; readonly rows: readonly (readonly string[])[] }
  | { readonly kind: "markdown"; readonly source: string }
  | { readonly kind: "image"; readonly src: string }
  | null;

/** Markdown that announces itself at the start of a line. */
const BLOCK_MARKDOWN =
  /^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\||-{3,}$)/m;
/** Markdown that only lives inside a line, and only counts across several. */
const INLINE_MARKDOWN = /(\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\n]+\)|`[^`\n]+`)/;

export function decidePaste(text: string): PasteDecision {
  if (text.trim() === "") return null;

  const src = imageUrl(text.trim());
  if (src) return { kind: "image", src };
  const rows = tabularRows(text);
  if (rows) return { kind: "table", rows };
  if (looksLikeMarkdown(text)) return { kind: "markdown", source: text };
  return null;
}

/** A picture the browser can show, told apart from a page URL by its path. */
const IMAGE_PATH = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

function imageUrl(text: string): string | null {
  if (/\s/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  // A query string is common on a CDN and says nothing about the file; the
  // path is what names it. `http` only: nothing else renders as an image.
  const http = url.protocol === "http:" || url.protocol === "https:";
  return http && IMAGE_PATH.test(url.pathname) ? text : null;
}

/**
 * The lines of a tab-separated grid, or null when the text is not one. A grid
 * needs at least two rows and two columns of the same width: a lone tab in a
 * sentence is a tab, not a table.
 */
function tabularRows(text: string): string[][] | null {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  if (lines.length < 2) return null;

  const rows = lines.map((line) => line.split("\t").map((cell) => cell.trim()));
  const width = rows[0].length;
  if (width < 2) return null;
  return rows.every((row) => row.length === width) ? rows : null;
}

function looksLikeMarkdown(text: string): boolean {
  if (BLOCK_MARKDOWN.test(text)) return true;
  return text.includes("\n") && INLINE_MARKDOWN.test(text);
}
