import type { DocumentNode } from "@/domain/documents/body";
import { markdownCarries } from "./directives";
import { guardLineStarts, inlineToModelMarkdown } from "./inline-marks";

/**
 * Lists, which are the one markdown construct a blank line would cut in half.
 *
 * So they are written tight: an item is one paragraph, optionally followed by
 * lists nested under it. An item holding anything else — two paragraphs, a
 * table, a callout — is not written as markdown at all; the whole list goes
 * back as JSON, which is rare and always exact.
 */

const INDENT = "  ";

const NESTED = new Set(["bulletList", "orderedList", "taskList"]);

type Marker = (index: number) => string;

function markerFor(node: DocumentNode): Marker | null {
  if (node.type === "bulletList") return () => "- ";
  if (node.type === "orderedList") {
    const start = Number(node.attrs?.start ?? 1);
    return (index) => `${start + index}. `;
  }
  return null;
}

/** The item's own line: one paragraph, on one line. */
function itemLine(item: DocumentNode): string | null {
  const [first] = item.content ?? [];
  if (!first || first.type !== "paragraph" || !markdownCarries(first)) return null;
  const text = inlineToModelMarkdown(first.content);
  // A hard break inside an item would leave a line no marker owns.
  if (text === null || text.includes("\n")) return null;
  return guardLineStarts(text);
}

function nestedLists(item: DocumentNode): string | null {
  const [, ...rest] = item.content ?? [];
  if (rest.some((child) => !NESTED.has(child.type ?? ""))) return null;
  const lists: string[] = [];
  for (const child of rest) {
    const nested = listToModelMarkdown(child);
    if (nested === null) return null;
    lists.push(nested.replace(/^/gm, INDENT));
  }
  return lists.join("\n");
}

function itemToMarkdown(item: DocumentNode, bullet: string): string | null {
  const line = itemLine(item);
  const nested = nestedLists(item);
  if (line === null || nested === null) return null;
  return nested ? `${bullet}${line}\n${nested}` : `${bullet}${line}`;
}

/** A list as markdown, or null when an item holds more than markdown can say. */
export function listToModelMarkdown(node: DocumentNode): string | null {
  if (node.type === "taskList") return taskListToMarkdown(node);
  const marker = markerFor(node);
  if (!marker) return null;

  const lines: string[] = [];
  const items = node.content ?? [];
  for (const [index, item] of items.entries()) {
    const written = itemToMarkdown(item, marker(index));
    if (written === null) return null;
    lines.push(written);
  }
  return lines.join("\n");
}

function taskListToMarkdown(node: DocumentNode): string | null {
  const lines: string[] = [];
  for (const item of node.content ?? []) {
    const box = item.attrs?.checked ? "x" : " ";
    const written = itemToMarkdown(item, `- [${box}] `);
    if (written === null) return null;
    lines.push(written);
  }
  return lines.join("\n");
}
