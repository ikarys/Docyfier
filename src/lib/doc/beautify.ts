import type { JSONContent } from "@tiptap/core";

/**
 * Deterministic formatter (hybrid "make it pretty", PLAN.md STEP 2b groundwork).
 *
 * The LLM pass rewrites prose but is inconsistent about structure and often
 * violates the style guide (hardcoded hex colors on titles, converting a table
 * to cards only some of the time). This pass runs AFTER the model and makes the
 * visual upgrades that must be guaranteed, not left to chance:
 *
 * - strip hardcoded text/highlight colors off headings — heading color belongs
 *   to the document THEME, never to inline hex the model invented;
 * - turn a two-column "label / value" table into a statRow (numeric values) or
 *   a cardGrid (prose values), every time, so the same input always upgrades.
 *
 * Pure and side-effect free: same input → same output. Output is re-validated
 * against the editor schema by the caller; anything it can't safely upgrade it
 * leaves untouched.
 */

const CARD_ACCENTS = ["blue", "green", "purple", "yellow"] as const;

/** A short figure like "42", "42%", "3x", "−73%", "1.2M€" — statRow material. */
function isFigure(text: string): boolean {
  const t = text.trim();
  if (!t || !/\d/.test(t)) return false;
  if (t.length > 14) return false;
  return t.split(/\s+/).length <= 2;
}

/** Flatten a node's text content (ignores marks/structure). */
function nodeText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (Array.isArray(node.content)) return node.content.map(nodeText).join("");
  return "";
}

/** Inline content of a cell's first paragraph (preserves marks), or a plain
 * text node built from the whole cell, or [] when empty. */
function cellInline(cell: JSONContent): JSONContent[] {
  const para = (cell.content ?? []).find((b) => b.type === "paragraph");
  if (para?.content?.length) return para.content;
  const text = nodeText(cell).trim();
  return text ? [{ type: "text", text }] : [];
}

/** Block content of a cell (its paragraphs), guaranteed non-empty. */
function cellBlocks(cell: JSONContent): JSONContent[] {
  const blocks = (cell.content ?? []).filter((b) => b.type === "paragraph");
  return blocks.length ? blocks : [{ type: "paragraph" }];
}

function heading3(inline: JSONContent[]): JSONContent {
  const node: JSONContent = { type: "heading", attrs: { level: 3 } };
  if (inline.length) node.content = inline;
  return node;
}

/** Rows of a table split into an optional header row + body rows. */
function tableRows(table: JSONContent): {
  hasHeader: boolean;
  header: JSONContent[] | null;
  body: JSONContent[][];
} {
  const rows = (table.content ?? []).filter((r) => r.type === "tableRow");
  const cellsOf = (row: JSONContent) => (row.content ?? []);
  const isHeaderRow = (row: JSONContent) =>
    cellsOf(row).length > 0 &&
    cellsOf(row).every((c) => c.type === "tableHeader");
  const hasHeader = rows.length > 0 && isHeaderRow(rows[0]);
  return {
    hasHeader,
    header: hasHeader ? cellsOf(rows[0]) : null,
    body: (hasHeader ? rows.slice(1) : rows).map(cellsOf),
  };
}

/**
 * Two-column "label / value" table → statRow (all values are figures) or
 * cardGrid (values are prose). Returns null when the table doesn't fit the
 * pattern (wrong column count, too few/many rows) so the caller keeps it as-is.
 */
function twoColumnTableToLayout(table: JSONContent): JSONContent | null {
  const { body } = tableRows(table);
  if (body.length < 2 || body.length > 4) return null;
  if (!body.every((cells) => cells.length === 2)) return null;

  const labels = body.map((cells) => cells[0]);
  const values = body.map((cells) => cells[1]);

  if (values.every((cell) => isFigure(nodeText(cell)))) {
    return {
      type: "statRow",
      content: body.map((_, i) => ({
        type: "stat",
        attrs: { accent: CARD_ACCENTS[i % CARD_ACCENTS.length], trend: "flat" },
        content: [
          { type: "paragraph", content: cellInline(values[i]) },
          { type: "paragraph", content: cellInline(labels[i]) },
        ],
      })),
    };
  }

  return {
    type: "cardGrid",
    attrs: { cols: body.length },
    content: body.map((_, i) => ({
      type: "card",
      attrs: { accent: CARD_ACCENTS[i % CARD_ACCENTS.length] },
      content: [heading3(cellInline(labels[i])), ...cellBlocks(values[i])],
    })),
  };
}

/** Drop textStyle/highlight (hardcoded hex) marks off an inline node. */
function stripInlineColor(inline: JSONContent): JSONContent {
  if (!Array.isArray(inline.marks)) return inline;
  const marks = inline.marks.filter(
    (m) => m.type !== "textStyle" && m.type !== "highlight",
  );
  const next: JSONContent = { ...inline };
  if (marks.length) next.marks = marks;
  else delete next.marks;
  return next;
}

/** Recursively strip invented color off every heading (theme owns it). */
function stripHeadingColors(node: JSONContent): JSONContent {
  let next = node;
  if (Array.isArray(node.content)) {
    next = { ...node, content: node.content.map(stripHeadingColors) };
  }
  if (next.type === "heading" && Array.isArray(next.content)) {
    next = { ...next, content: next.content.map(stripInlineColor) };
  }
  return next;
}

/** Apply every deterministic upgrade to a whole document. */
export function beautify(doc: JSONContent): JSONContent {
  if (doc?.type !== "doc" || !Array.isArray(doc.content)) return doc;
  const content = doc.content.map((block) => {
    const upgraded =
      block.type === "table" ? twoColumnTableToLayout(block) : null;
    return stripHeadingColors(upgraded ?? block);
  });
  return { ...doc, content };
}
