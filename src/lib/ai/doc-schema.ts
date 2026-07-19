import "server-only";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Callout } from "@/components/extensions/Callout";

/**
 * Headless ProseMirror schema mirroring the editor's extensions
 * (src/components/Editor.tsx). Every piece of AI output is validated against
 * it server-side before it is ever injected into the editor — invalid JSON
 * triggers a retry, never a broken document.
 */
const schema = getSchema([
  StarterKit,
  Callout,
  Table,
  TableRow,
  TableHeader,
  TableCell,
]);

/** Throws with a descriptive message when `json` is not a valid document. */
export function validateDocJson(json: unknown): JSONContent {
  if (typeof json !== "object" || json === null) {
    throw new Error("Output is not a JSON object");
  }
  if ((json as { type?: unknown }).type !== "doc") {
    throw new Error('Root node must be {"type": "doc", ...}');
  }
  const node = PMNode.fromJSON(schema, json);
  node.check();
  return json as JSONContent;
}
