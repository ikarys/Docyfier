import type { ThinkingEffort } from "./text-generator";

/**
 * How much thinking a call is worth (PLAN.md STEP U14).
 *
 * It was declared per assistant, on the reasoning that both of them work on
 * content that already exists. Measurement says otherwise: what decides is not
 * who is working but how much of the document is at stake. Rewriting one
 * paragraph is one decision; restructuring sixty blocks is a plan, and a model
 * asked to make that plan with the least thinking answers with the least edit
 * it can defend.
 */

/** How much of a document a single call answers for. */
export type Stake =
  /** One block, named by the user, with its replacement fully determined. */
  | "block"
  /** A selected passage: several blocks, one instruction. */
  | "passage"
  /** The whole document — the only call that has to decide what to change. */
  | "document";

export function effortFor(stake: Stake): ThinkingEffort {
  return stake === "document" ? "medium" : "low";
}
