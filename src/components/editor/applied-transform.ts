import type { JSONContent } from "@tiptap/core";
import type { TransformOutcome } from "@/lib/ai/service";
import { applyOps } from "@/domain/authoring/ops";

/**
 * The document a whole-document AI edit leaves behind.
 *
 * A model that answers with ops names the blocks it touched, so those are
 * applied and everything else stays byte-identical — the whole point of the op
 * contract. A model that answers with a document replaces it wholesale.
 *
 * Either way the result is compared with what went in: an edit that changed
 * nothing is not an edit, and telling the user it worked would be a lie.
 */
export interface AppliedTransform {
  next: JSONContent;
  changed: boolean;
  /** Blocks the model named, or 0 when it rewrote the whole document. */
  blocksEdited: number;
}

export function applyTransform(
  before: JSONContent,
  outcome: TransformOutcome,
): AppliedTransform {
  const next =
    outcome.kind === "ops"
      ? (applyOps(before, outcome.ops) as JSONContent)
      : (outcome.content as JSONContent);
  return {
    next,
    changed: JSON.stringify(next) !== JSON.stringify(before),
    blocksEdited: outcome.kind === "ops" ? outcome.ops.length : 0,
  };
}
