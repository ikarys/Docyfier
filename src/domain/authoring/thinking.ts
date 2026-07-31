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

/**
 * How many tokens a call may spend, which is the other half of what it is worth.
 *
 * A reasoning model calibrates how long it deliberates on the budget it is
 * handed, and the instance's budget is sized for a whole document. Sent with a
 * request to redraw one block it buys minutes of thinking for an answer that
 * cannot exceed a few hundred tokens — measured on a ten-box drawing that took
 * ten minutes. `reasoning_effort` asks the model to be brief and is ignored by
 * some providers; a budget is not a request.
 *
 * `budget` is the instance's own ceiling and always wins: it is the number
 * somebody chose, and this is a guess made per call.
 */
const ROOM: Record<Stake, number> = {
  block: 2048,
  passage: 4096,
  document: 32768,
};

export function tokensFor(stake: Stake, budget = Number.POSITIVE_INFINITY): number {
  return Math.min(ROOM[stake], budget);
}
