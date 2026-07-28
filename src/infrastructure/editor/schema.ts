import "server-only";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { chartError } from "@/domain/documents/chart";
import { DOCUMENT_EXTENSIONS, VIEWED_NODES } from "./document-extensions";

/**
 * The headless ProseMirror schema, built from the very extensions the editor
 * renders. Every piece of AI output is validated against it server-side before
 * it is ever injected into the editor — invalid JSON triggers a retry, never a
 * broken document.
 */
export const editorSchema = getSchema([...DOCUMENT_EXTENSIONS, ...VIEWED_NODES]);

/** Throws with a descriptive message when `json` is not a valid document. */
export function validateDocJson(json: unknown): JSONContent {
  if (typeof json !== "object" || json === null) {
    throw new Error("Output is not a JSON object");
  }
  if ((json as { type?: unknown }).type !== "doc") {
    throw new Error('Root node must be {"type": "doc", ...}');
  }
  const node = PMNode.fromJSON(editorSchema, json);
  node.check();
  // ProseMirror only checks node/mark shape; chart attrs carry their own rules
  // (series/category lengths, numeric values) that must fail loudly here so the
  // AI retry loop can fix them instead of persisting an unrenderable block.
  node.descendants((child) => {
    if (child.type.name !== "chart") return true;
    const error = chartError(child.attrs);
    if (error) throw new Error(error);
    return false;
  });
  return json as JSONContent;
}
