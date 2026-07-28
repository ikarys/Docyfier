import type { DocumentBody, DocumentNode } from "@/domain/documents/body";

/**
 * A document boiled down to what it is about — the input the planning pass
 * needs to dress an existing document.
 *
 * Headings and the opening of each paragraph say the subject; the other blocks
 * are named rather than read, because what a chart or a stat row *contains*
 * says nothing about how the document should look, while the fact that it has
 * one says a lot. Sending the whole document instead would cost the tokens of a
 * full transform to answer a question about its cover.
 */

const MAX_LINES = 24;
const MAX_LINE = 140;

function flatten(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(flatten).join(" ").replace(/\s+/g, " ").trim();
}

function lineOf(node: DocumentNode): string {
  if (node.type === "heading") {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
    return `${"#".repeat(level)} ${flatten(node)}`.trim();
  }
  if (node.type === "paragraph") return flatten(node);
  return `[${node.type}]`;
}

export function digestOf(body: DocumentBody): string {
  return (body.content ?? [])
    .map(lineOf)
    .filter((line) => line.trim().length > 0)
    .slice(0, MAX_LINES)
    .map((line) => line.slice(0, MAX_LINE))
    .join("\n");
}
