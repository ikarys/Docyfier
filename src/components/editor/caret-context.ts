import { digestOf } from "@/domain/authoring/document-digest";
import type { DocumentBody, DocumentNode } from "@/domain/documents/body";
import type { CaretContext } from "@/lib/ai/service";

/**
 * What the model is told about where the caret is (PLAN.md STEP U11), and what
 * happens to the block it sits in when the answer comes back.
 *
 * Pure, and stated over the document body rather than over a ProseMirror
 * selection, so both rules are testable without an editor: the hook only ever
 * hands them a body and the index of the top-level block the caret is in.
 */

function flatten(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(flatten).join(" ").replace(/\s+/g, " ").trim();
}

/** The digest of the whole document, plus the words the caret sits among. */
export function caretContextOf(body: DocumentBody, index: number): CaretContext {
  const block = (body.content ?? [])[index];
  return { digest: digestOf(body), here: block ? flatten(block) : "" };
}

/**
 * An empty block at the caret is what the answer replaces; anything else it is
 * written under. Without this, asking an empty document for a first block
 * leaves the paragraph it started life with above the answer.
 */
export function caretLanding(body: DocumentBody, index: number): "replace" | "after" {
  const block = (body.content ?? [])[index];
  if (!block) return "after";
  // A paragraph with nothing in it, and only that: a block with no words can
  // still be a chart or a diagram, and replacing one would delete a figure.
  return block.type === "paragraph" && flatten(block) === "" ? "replace" : "after";
}
