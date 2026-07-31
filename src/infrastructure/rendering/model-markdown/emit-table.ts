import type { DocumentNode } from "@/domain/documents/body";
import { markdownCarries } from "./directives";
import { inlineToModelMarkdown } from "./inline-marks";

/**
 * Tables, which markdown writes only in one shape: a header row, then body
 * rows, one paragraph per cell and no cell spanning another.
 *
 * A table that is anything else — a merged cell, a cell holding a list, a
 * first row that is not a header — goes back as JSON. The alignment markdown
 * *can* carry is per column, so a column whose cells disagree is not written
 * either.
 */

const ALIGN_RULE: Record<string, string> = {
  left: ":---",
  center: ":---:",
  right: "---:",
};

const DEFAULT_RULE = "---";

function cellText(cell: DocumentNode): string | null {
  const children = cell.content ?? [];
  if (children.length !== 1) return null;
  const [only] = children;
  if (only.type !== "paragraph" || !markdownCarries(only)) return null;
  const text = inlineToModelMarkdown(only.content);
  // A pipe is the column separator and a newline is the row separator; only
  // the first has an escape markdown agrees on.
  if (text === null || text.includes("\n")) return null;
  return text.replace(/\|/g, "\\|");
}

function rowCells(row: DocumentNode, type: string): DocumentNode[] | null {
  const cells = row.content ?? [];
  if (!cells.length) return null;
  const shaped = cells.every((cell) => cell.type === type && markdownCarries(cell));
  return shaped ? cells : null;
}

/** One alignment per column, or null when a column's cells disagree. */
function columnAlignments(rows: DocumentNode[][]): (string | null)[] | null {
  const width = rows[0].length;
  if (rows.some((row) => row.length !== width)) return null;

  const aligns: (string | null)[] = [];
  for (let column = 0; column < width; column++) {
    const values = rows.map((row) => (row[column].attrs?.align as string | undefined) ?? null);
    const [first] = values;
    if (values.some((value) => value !== first)) return null;
    aligns.push(first);
  }
  return aligns;
}

/** A table as markdown, or null when its shape is not one markdown has. */
export function tableToModelMarkdown(node: DocumentNode): string | null {
  const [header, ...body] = node.content ?? [];
  if (!header) return null;

  const headerCells = rowCells(header, "tableHeader");
  if (!headerCells) return null;
  const bodyCells: DocumentNode[][] = [];
  for (const row of body) {
    const cells = rowCells(row, "tableCell");
    if (!cells) return null;
    bodyCells.push(cells);
  }

  const rows = [headerCells, ...bodyCells];
  const aligns = columnAlignments(rows);
  if (!aligns) return null;

  const lines: string[] = [];
  for (const cells of rows) {
    const written: string[] = [];
    for (const cell of cells) {
      const text = cellText(cell);
      if (text === null) return null;
      written.push(text);
    }
    lines.push(`| ${written.join(" | ")} |`);
  }
  const rule = aligns.map((align) => (align ? ALIGN_RULE[align] : DEFAULT_RULE));
  if (rule.some((cell) => !cell)) return null;
  lines.splice(1, 0, `| ${rule.join(" | ")} |`);
  return lines.join("\n");
}
