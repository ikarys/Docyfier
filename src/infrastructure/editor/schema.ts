import "server-only";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { chartError } from "@/domain/documents/chart";
import { diagramError } from "@/domain/documents/diagram/validation";
import { DOCUMENT_EXTENSIONS, VIEWED_NODES } from "./document-extensions";

/**
 * Nodes whose attributes carry rules ProseMirror knows nothing about.
 *
 * ProseMirror checks node and mark shape only; a chart's series lengths and a
 * diagram's edge endpoints are the domain's business. Each rule is registered
 * here rather than typed into a branch, so a new block with its own invariants
 * is one line — the shape the export targets and the composers already use.
 */
const ATTRIBUTE_RULES: Record<string, (attrs: unknown) => string | null> = {
  chart: chartError,
  diagram: diagramError,
};

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
  // These must fail loudly here so the AI retry loop can fix them instead of
  // persisting a block nothing can render.
  node.descendants((child) => {
    const rule = ATTRIBUTE_RULES[child.type.name];
    if (!rule) return true;
    const error = rule(child.attrs);
    if (error) throw new Error(error);
    return false;
  });
  return json as JSONContent;
}
