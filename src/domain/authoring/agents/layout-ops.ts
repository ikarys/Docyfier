import type { DocumentNode } from "@/domain/documents/body";
import {
  driftMessage,
  isFaithfulLayout,
  layoutBlocksIntroduced,
  layoutDrift,
} from "../layout-fidelity";
import type { DocOp } from "../ops";
import type { AgentId } from "./contract";

/**
 * The same charters, applied to one operation (PLAN.md STEP U13).
 *
 * A whole-document edit arrives as operations, one block at a time, streamed —
 * so it is judged one block at a time too. That is a better place to judge from
 * than the finished document: a single bad operation is dropped where it stands
 * and everything else the assistant got right still lands.
 */

/**
 * Words an inserted block may hold before it stops being a label.
 *
 * A heading, a caption or a column title is the layout assistant doing its job.
 * A sentence is it writing one, which is the other assistant's work.
 */
const MAX_LABEL_WORDS = 12;

function wordsIn(blocks: DocumentNode[]): number {
  return blocks
    .map((block) => text(block))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function text(node: DocumentNode): string {
  if (node.text !== undefined) return node.text;
  return (node.content ?? []).map(text).join(" ");
}

function designerBreach(op: DocOp, covered: DocumentNode[]): string {
  if (op.op === "delete") {
    return "you removed a block: arranging content is not throwing it away";
  }
  if (op.op === "insert_after") {
    return wordsIn(op.blocks) <= MAX_LABEL_WORDS
      ? ""
      : "you wrote new content: an inserted block may only be a heading or a caption";
  }
  const drift = layoutDrift(covered, op.blocks);
  return isFaithfulLayout(drift) ? "" : `you changed the text: ${driftMessage(drift)}`;
}

function writerBreach(op: DocOp, covered: DocumentNode[]): string {
  if (op.op === "delete") return "";
  const introduced = layoutBlocksIntroduced(covered, op.blocks);
  return introduced.length === 0
    ? ""
    : `you introduced ${introduced.join(", ")}: presenting the content is the layout assistant's job`;
}

/**
 * What this assistant was not allowed to do with this operation, or `""` when
 * it stayed in its lane. `covered` is every block the operation stands in for,
 * which for a merge is several — judging one against only the first would call
 * every gathered block a rewrite. An operation covering nothing is left alone:
 * `parseOps` already refuses those, and judging one against nothing would
 * reject it for the wrong reason.
 */
export function opBreach(agent: AgentId, op: DocOp, covered: DocumentNode[]): string {
  if (covered.length === 0) return "";
  return agent === "designer" ? designerBreach(op, covered) : writerBreach(op, covered);
}
