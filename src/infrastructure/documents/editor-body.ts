import type { JSONContent } from "@tiptap/core";

/**
 * Rebuild ProseMirror JSON out of plain objects before it crosses a server
 * action boundary.
 *
 * ProseMirror computes every node/mark `attrs` with `Object.create(null)` and
 * `toJSON()` hands those very objects back (prosemirror-model `computeAttrs`).
 * React Server Functions refuse null-prototype objects — "Only plain objects,
 * and a few built-ins, can be passed to Server Functions" — so the `attrs`
 * never reach the server: headings lose their level, callouts their variant,
 * badges their color. Text survives, styling silently does not.
 *
 * A JSON round-trip is the cheapest faithful fix: same data, plain prototypes.
 */
export function toPlainJSON<T extends JSONContent | JSONContent[]>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
