import type { DocumentNode } from "@/domain/documents/body";
import { parseInline } from "./parse-inline";

/**
 * Lists on the way back. The emitter writes them tight — one paragraph per
 * item, nested lists indented by two — so reading one is: a marker at column
 * zero opens an item, and everything indented under it belongs to that item.
 *
 * A line that fits no marker makes the whole thing null, and the caller reads
 * the block as a paragraph instead. Nothing here guesses.
 */

const INDENT = 2;

const TASK = /^- \[([ xX])\] (.*)$/;
const BULLET = /^[-+] (.*)$/;
const ORDERED = /^(\d+)[.)] (.*)$/;

interface Marker {
  readonly list: string;
  readonly item: string;
  /** The text of the item, or null when the line does not open one. */
  head(line: string): string | null;
  attrs?(line: string): Record<string, unknown>;
}

const TASK_MARKER: Marker = {
  list: "taskList",
  item: "taskItem",
  head: (line) => TASK.exec(line)?.[2] ?? null,
  attrs: (line) => ({ checked: (TASK.exec(line)?.[1] ?? " ").toLowerCase() === "x" }),
};

const BULLET_MARKER: Marker = {
  list: "bulletList",
  item: "listItem",
  head: (line) => BULLET.exec(line)?.[1] ?? null,
};

const ORDERED_MARKER: Marker = {
  list: "orderedList",
  item: "listItem",
  head: (line) => ORDERED.exec(line)?.[2] ?? null,
};

function markerFor(line: string): Marker | null {
  if (TASK.test(line)) return TASK_MARKER;
  if (BULLET.test(line)) return BULLET_MARKER;
  if (ORDERED.test(line)) return ORDERED_MARKER;
  return null;
}

interface Group {
  readonly line: string;
  readonly nested: string[];
}

/** The lines cut into items: each marker line, with what is indented under it. */
function groupItems(lines: string[], marker: Marker): Group[] | null {
  const groups: Group[] = [];
  for (const line of lines) {
    if (marker.head(line) !== null && !line.startsWith(" ")) {
      groups.push({ line, nested: [] });
      continue;
    }
    const current = groups.at(-1);
    if (!current || !line.startsWith(" ".repeat(INDENT))) return null;
    current.nested.push(line.slice(INDENT));
  }
  return groups.length ? groups : null;
}

function itemFrom(group: Group, marker: Marker): DocumentNode | null {
  const head = marker.head(group.line);
  if (head === null) return null;
  const content: DocumentNode[] = [{ type: "paragraph", content: parseInline(head) }];
  if (group.nested.length) {
    const nested = parseList(group.nested);
    if (!nested) return null;
    content.push(nested);
  }
  const attrs = marker.attrs?.(group.line);
  return { type: marker.item, ...(attrs ? { attrs } : {}), content };
}

/** A list, or null when these lines are not one. */
export function parseList(lines: string[]): DocumentNode | null {
  const [first] = lines;
  const marker = first ? markerFor(first) : null;
  if (!marker) return null;

  const groups = groupItems(lines, marker);
  if (!groups) return null;

  const content: DocumentNode[] = [];
  for (const group of groups) {
    const item = itemFrom(group, marker);
    if (!item) return null;
    content.push(item);
  }

  const start = marker === ORDERED_MARKER ? Number(ORDERED.exec(first)?.[1] ?? 1) : null;
  return { type: marker.list, ...(start === null ? {} : { attrs: { start } }), content };
}
