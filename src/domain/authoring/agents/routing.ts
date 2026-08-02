import type { BlockAction } from "../block-actions/contract";
import type { AgentId } from "./contract";

/**
 * Who runs, in what order, and why (PLAN.md STEP U13).
 *
 * Every surface says what it wants: a block action carries its family, "Style
 * for me" is a styling request, a bubble quick action is a rewrite. A free
 * prompt says nothing about itself — and used to be read by a model, which cost
 * a whole round trip, with its own contract and its own thinking, before the
 * work had begun. It is answered by the writer instead: touching the words and
 * not the shape is the safe half of any request, and the user who wanted the
 * other half is one click from the styling action, on a passage that has
 * settled. Two assistants in one click were two waits in one click.
 */

export interface Assignment {
  /** The assistants to run, in order. */
  readonly steps: readonly AgentId[];
  /** Why these ones — shown to the user while they work. */
  readonly reason: string;
}

const WRITER: Assignment = { steps: ["writer"], reason: "Rewriting the words" };
const DESIGNER: Assignment = {
  steps: ["designer"],
  reason: "Laying out — it arranges what is already written",
};

/** What a surface can say about itself. */
export type Surface =
  /** One of the catalog's per-block actions; its family names the assistant. */
  | { kind: "block-action"; family: BlockAction["family"]; actionId?: BlockAction["id"] }
  /** A button that asks for a shape: "Make it pretty". */
  | { kind: "styling" }
  /** A button that asks for other words: shorten, formal, add a conclusion. */
  | { kind: "rewording" }
  /** The user's own words, which name no assistant. */
  | { kind: "free-prompt" };

/** The assignment a surface implies. Never a model call, never a wait. */
export function routeSurface(surface: Surface): Assignment {
  switch (surface.kind) {
    case "block-action":
      return surface.family === "turn-into" ? DESIGNER : WRITER;
    case "styling":
      return DESIGNER;
    default:
      // Rewording, and anything nobody can read by its shape: changing the
      // shape of a passage nobody asked to reshape is worse than doing less.
      return WRITER;
  }
}
