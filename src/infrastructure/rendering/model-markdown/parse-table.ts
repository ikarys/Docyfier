import type { DocumentNode } from "@/domain/documents/body";
import { parseInline } from "./parse-inline";

/**
 * Tables on the way back: a header row, the rule that names each column's
 * alignment, then the body. Anything that is not that shape is not a table, and
 * the caller reads the block as a paragraph.
 */

const RULE = /^\|[\s:|-]+\|$/;

const ALIGN_BY_RULE = (cell: string): string | null => {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (left) return "left";
  if (right) return "right";
  return null;
};

/** A row's cells, with `\|` left escaped so the inline scanner unwraps it. */
function cellsOf(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let buffer = "";
  for (let at = 0; at < inner.length; at++) {
    const char = inner[at];
    if (char === "\\") {
      buffer += char + (inner[at + 1] ?? "");
      at++;
      continue;
    }
    if (char === "|") {
      cells.push(buffer);
      buffer = "";
      continue;
    }
    buffer += char;
  }
  cells.push(buffer);
  return cells.map((cell) => cell.trim());
}

function cellNode(text: string, type: string, align: string | null): DocumentNode {
  const content = parseInline(text);
  return {
    type,
    ...(align ? { attrs: { align } } : {}),
    content: [{ type: "paragraph", ...(content.length ? { content } : {}) }],
  };
}

function rowNode(line: string, type: string, aligns: (string | null)[]): DocumentNode {
  return {
    type: "tableRow",
    content: cellsOf(line).map((cell, column) => cellNode(cell, type, aligns[column] ?? null)),
  };
}

/** A table, or null when these lines are not one. */
export function parseTable(lines: string[]): DocumentNode | null {
  const [header, rule, ...body] = lines;
  if (!header?.startsWith("|") || !rule || !RULE.test(rule.trim()) || !rule.includes("-")) {
    return null;
  }
  const aligns = cellsOf(rule).map(ALIGN_BY_RULE);
  return {
    type: "table",
    content: [
      rowNode(header, "tableHeader", aligns),
      ...body.map((line) => rowNode(line, "tableCell", aligns)),
    ],
  };
}
