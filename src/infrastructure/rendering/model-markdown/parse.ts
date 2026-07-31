import type { DocumentNode } from "@/domain/documents/body";
import { FENCE, directiveBody } from "./directives";
import { parseInline } from "./parse-inline";
import { parseList } from "./parse-lists";
import { parseTable } from "./parse-table";
import { splitBlocks } from "./split-blocks";

/**
 * A model's answer read back as a document.
 *
 * Forgiving on the way in, exact on the way out: a delimiter that does not
 * close, a directive nobody declared, a list item that fits no marker — each
 * falls back to the reading a person would give it rather than failing. What
 * the answer becomes is still checked against the schema downstream, so a
 * generous reading here can never store a block the editor cannot render.
 */

const OPENING = new RegExp(`^${FENCE} (\\S+)(?: (.*))?$`);
const CODE = /^(`{3,})(.*)$/;
const HEADING = /^(#{1,6}) (.*)$/;
const MATH = "$$";

function withContent(node: DocumentNode, content: DocumentNode[]): DocumentNode {
  // An empty `content` is a shape the schema refuses; the key simply goes.
  return content.length ? { ...node, content } : node;
}

function attrsOf(written: string | undefined): Record<string, unknown> | null {
  if (!written) return null;
  try {
    const parsed: unknown = JSON.parse(written);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function bodyLines(lines: string[]): string[] {
  const closed = lines.at(-1)?.trim() === FENCE;
  return lines.slice(1, closed ? -1 : undefined);
}

function directiveFrom(lines: string[]): DocumentNode[] {
  const opening = OPENING.exec(lines[0]);
  if (!opening) return [];
  const [, name, written] = opening;
  const body = bodyLines(lines);
  const kind = directiveBody(name);

  // A directive no vocabulary declares still holds content someone wrote.
  if (kind === null) return modelMarkdownToBlocks(body.join("\n"));
  if (kind === "raw") return rawFrom(body.join("\n"));

  const attrs = attrsOf(written);
  const node: DocumentNode = { type: name, ...(attrs ? { attrs } : {}) };
  if (kind === "none") return [node];
  const content =
    kind === "inline" ? parseInline(body.join("\n")) : modelMarkdownToBlocks(body.join("\n"));
  return [withContent(node, content)];
}

function rawFrom(written: string): DocumentNode[] {
  try {
    const parsed: unknown = JSON.parse(written);
    return typeof parsed === "object" && parsed !== null ? [parsed as DocumentNode] : [];
  } catch {
    return [];
  }
}

function codeFrom(lines: string[]): DocumentNode[] {
  const [, fence, language] = CODE.exec(lines[0]) ?? [];
  const closed = lines.at(-1)?.trim().startsWith(fence ?? "```");
  const text = lines.slice(1, closed && lines.length > 1 ? -1 : undefined).join("\n");
  const node: DocumentNode = { type: "codeBlock", attrs: { language: language || null } };
  return [withContent(node, text ? [{ type: "text", text }] : [])];
}

function mathFrom(lines: string[]): DocumentNode[] {
  const closed = lines.at(-1)?.trim() === MATH;
  const latex = lines.slice(1, closed && lines.length > 1 ? -1 : undefined).join("\n");
  return [{ type: "blockMath", attrs: { latex } }];
}

function quoteFrom(lines: string[]): DocumentNode[] {
  const inner = lines.map((line) => line.replace(/^> ?/, "")).join("\n");
  return [withContent({ type: "blockquote" }, modelMarkdownToBlocks(inner))];
}

function headingFrom(lines: string[]): DocumentNode[] {
  const [, hashes, written] = HEADING.exec(lines[0]) as RegExpExecArray;
  const node = withContent(
    { type: "heading", attrs: { level: hashes.length } },
    parseInline(written),
  );
  // A heading no blank line followed still ends at its own line.
  return [node, ...(lines.length > 1 ? parseBlock(lines.slice(1).join("\n")) : [])];
}

function parseBlock(chunk: string): DocumentNode[] {
  const lines = chunk.split("\n");
  const [first] = lines;

  if (OPENING.test(first)) return directiveFrom(lines);
  if (CODE.test(first)) return codeFrom(lines);
  if (first.trim() === MATH) return mathFrom(lines);
  if (chunk.trim() === "---") return [{ type: "horizontalRule" }];
  if (HEADING.test(first)) return headingFrom(lines);
  if (lines.every((line) => line.startsWith(">"))) return quoteFrom(lines);

  const list = parseList(lines);
  if (list) return [list];
  const table = parseTable(lines);
  if (table) return [table];

  return [withContent({ type: "paragraph" }, parseInline(chunk))];
}

/** The blocks a model's answer describes. */
export function modelMarkdownToBlocks(text: string): DocumentNode[] {
  return splitBlocks(text).flatMap(parseBlock);
}
