import type { DocumentNode } from "../../documents/body";
import {
  driftMessage,
  isFaithfulLayout,
  layoutBlocksIntroduced,
  layoutDrift,
} from "../layout-fidelity";
import type { Agent } from "./contract";

/**
 * What an assistant is forbidden to have done (PLAN.md STEP U13).
 *
 * A charter is a request, and every model drifts out of its lane; this is the
 * same charter as a verdict on the answer. It lives in the domain rather than
 * inside one use case because two paths now reach it — the blocking edit, where
 * a breach feeds the retry and is quoted back to the model, and the streamed
 * edit, where it arrives too late to retry and rolls the answer back instead.
 * One rule, stated once, whatever happens to be done with the verdict.
 */
export function charterBreach(
  agent: Agent,
  before: DocumentNode[],
  after: DocumentNode[],
): string {
  if (after.length === 0) return "you replaced the passage with nothing";
  if (agent.id === "designer") {
    const drift = layoutDrift(before, after);
    return isFaithfulLayout(drift) ? "" : `you changed the text: ${driftMessage(drift)}`;
  }
  const introduced = layoutBlocksIntroduced(before, after);
  return introduced.length === 0
    ? ""
    : `you introduced ${introduced.join(", ")}: presenting the content is the layout assistant's job`;
}
