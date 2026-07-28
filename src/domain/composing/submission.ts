import type { ComposeContext } from "./composer";

/**
 * How a submitted composer form relates to the previous run.
 *
 * The keys are the contract between the form and whoever reads it: they are not
 * declared fields, so a composer cannot collide with one and the field reader
 * never sees them.
 */

export const REVISING_KEY = "__revising";
export const GUIDANCE_KEY = "__guidance";
export const INTENT_KEY = "__intent";

/** The button that asks for guidance, as opposed to a plain re-run. */
export const IMPROVE_INTENT = "improve";

/** Longest accepted revision instruction — same budget guard as a field. */
const MAX_GUIDANCE = 2000;

export interface Submission {
  revising: string | null;
  intent: string | null;
  guidance: string | null;
}

/**
 * Guidance is honoured only for the button that asks for it: a re-run must not
 * silently re-apply an instruction left in the box.
 */
export function composeContext(submission: Submission): ComposeContext {
  const guidance =
    submission.intent === IMPROVE_INTENT
      ? (submission.guidance ?? "").trim().slice(0, MAX_GUIDANCE)
      : "";
  return { revising: submission.revising === "1", guidance };
}
