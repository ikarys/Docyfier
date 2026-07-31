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
  if (node.type === "diagram") return diagramLine(node);
  return `[${node.type}]`;
}

/**
 * A diagram is named *with its boxes*, unlike the other blocks.
 *
 * What a chart contains says nothing about how the document should look, but a
 * diagram's labels are the only trace of the system it describes: without them
 * a later pass asked to amend it would have to invent the graph again.
 */
function diagramLine(node: DocumentNode): string {
  const declared = node.attrs?.nodes;
  const labels = (Array.isArray(declared) ? declared : [])
    .map((entry) => (entry as { label?: unknown }).label)
    .filter((label): label is string => typeof label === "string");
  return labels.length > 0 ? `[diagram: ${labels.join(" · ")}]` : "[diagram]";
}

/**
 * The same reading, block by block and numbered — what a layout plan is decided
 * from.
 *
 * The digest answers "what is this document about" and stops at two dozen
 * lines; a plan has to see every block, because it names the ones it wants to
 * restructure by index. Both read a block the same way, which is why the rule
 * lives here once: it costs a fifth of the document's JSON and is the only form
 * a model can scan without rebuilding it in its head.
 */
export function outlineOf(blocks: DocumentNode[]): string {
  return blocks.map((block, at) => `${at}: ${lineOf(block).slice(0, MAX_LINE)}`).join("\n");
}

export function digestOf(body: DocumentBody): string {
  return (body.content ?? [])
    .map(lineOf)
    .filter((line) => line.trim().length > 0)
    .slice(0, MAX_LINES)
    .map((line) => line.slice(0, MAX_LINE))
    .join("\n");
}
