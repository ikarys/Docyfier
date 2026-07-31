import type { DocumentNode } from "@/domain/documents/body";
import { FENCE, JSON_DIRECTIVE, directiveBody, markdownCarries } from "./directives";
import { listToModelMarkdown } from "./emit-lists";
import { tableToModelMarkdown } from "./emit-table";
import { guardLineStarts, inlineToModelMarkdown } from "./inline-marks";

/**
 * A document on its way to a model.
 *
 * Every writer here returns null rather than approximating, and a null lands in
 * `asJson`: the block travels as its own JSON, which costs what JSON costs but
 * never loses an attribute. Nothing else in this file has to be careful,
 * because nothing else is allowed to guess.
 */

const HEADINGS = ["#", "##", "###", "####", "#####", "######"];

const BLOCK_SEPARATOR = "\n\n";

type Emitter = (node: DocumentNode) => string | null;

/** The block as the JSON escape hatch — always exact, and the last resort. */
function asJson(node: DocumentNode): string {
  return `${FENCE} ${JSON_DIRECTIVE}\n${JSON.stringify(node)}\n${FENCE}`;
}

function openingLine(node: DocumentNode): string {
  const attrs = node.attrs ?? {};
  const written = Object.keys(attrs).length ? ` ${JSON.stringify(attrs)}` : "";
  return `${FENCE} ${node.type}${written}`;
}

function directive(node: DocumentNode): string | null {
  const body = directiveBody(node.type);
  if (body === null) return null;
  const opening = openingLine(node);
  // Every directive closes, including the ones with nothing inside: one rule to
  // state, and one habit for a model to keep.
  if (body === "none") return `${opening}\n${FENCE}`;
  if (body === "inline") {
    const text = inlineToModelMarkdown(node.content);
    return text === null ? null : `${opening}\n${guardLineStarts(text)}\n${FENCE}`;
  }
  return `${opening}\n${blocksToModelMarkdown(node.content ?? [])}\n${FENCE}`;
}

function paragraph(node: DocumentNode): string | null {
  const text = inlineToModelMarkdown(node.content);
  return text === null ? null : guardLineStarts(text);
}

function heading(node: DocumentNode): string | null {
  const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
  const text = inlineToModelMarkdown(node.content);
  return text === null ? null : `${HEADINGS[level - 1]} ${text}`;
}

function blockquote(node: DocumentNode): string {
  return blocksToModelMarkdown(node.content ?? [])
    .split("\n")
    .map((line) => `>${line ? ` ${line}` : ""}`)
    .join("\n");
}

/** Code text, verbatim, behind a fence long enough to hold its own backticks. */
function codeBlock(node: DocumentNode): string {
  const text = (node.content ?? []).map((child) => child.text ?? "").join("");
  const runs = [...text.matchAll(/^`+/gm)].map((match) => match[0].length);
  const fence = "`".repeat(Math.max(2, ...runs) + 1);
  const language = (node.attrs?.language as string | null) ?? "";
  return `${fence}${language}\n${text}\n${fence}`;
}

function blockMath(node: DocumentNode): string | null {
  const latex = String(node.attrs?.latex ?? "");
  // The delimiter inside the formula would close it early.
  return latex.includes("$$") ? null : `$$\n${latex}\n$$`;
}

const NATIVE: Record<string, Emitter> = {
  paragraph,
  heading,
  blockquote,
  bulletList: listToModelMarkdown,
  orderedList: listToModelMarkdown,
  taskList: listToModelMarkdown,
  table: tableToModelMarkdown,
  codeBlock,
  horizontalRule: () => "---",
  blockMath,
};

/**
 * Markdown first, then a directive, then JSON: the order is the whole policy.
 * A paragraph markdown can write is written as one; the same paragraph carrying
 * an alignment falls to `::: paragraph`, and only what neither can say becomes
 * JSON.
 */
function emitBlock(node: DocumentNode): string {
  return writeNative(node) ?? directive(node) ?? asJson(node);
}

function writeNative(node: DocumentNode): string | null {
  const native = NATIVE[node.type ?? ""];
  if (!native || !markdownCarries(node)) return null;
  return native(node);
}

export function blocksToModelMarkdown(blocks: DocumentNode[]): string {
  return blocks.map(emitBlock).join(BLOCK_SEPARATOR);
}
