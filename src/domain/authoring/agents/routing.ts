import type { BlockAction } from "../block-actions/contract";
import type { AgentId } from "./contract";

/**
 * Who runs, in what order, and why (PLAN.md STEP U13).
 *
 * Most surfaces already say what they want: a block action carries its family,
 * "Style for me" is a styling request, a bubble quick action is a rewrite.
 * Routing those through a model would spend seconds to learn what the catalog
 * already knows. Only a free prompt — "shorten it and make it scannable" — has
 * to be read, and that is the one place a call is worth its cost.
 */

export interface Assignment {
  /** The assistants to run, in order. */
  readonly steps: readonly AgentId[];
  /** Why these ones — shown to the user while they work. */
  readonly reason: string;
}

/** What a surface can say about itself without a model reading anything. */
export type Surface =
  /** One of the catalog's per-block actions; its family names the assistant. */
  | { kind: "block-action"; family: BlockAction["family"] }
  /** A button that asks for a shape: "Make it pretty". */
  | { kind: "styling" }
  /** A button that asks for other words: shorten, formal, add a conclusion. */
  | { kind: "rewording" }
  /** The user's own words, which only a model can read. */
  | { kind: "free-prompt" };

const WRITER: Assignment = { steps: ["writer"], reason: "Rewriting the words" };
const DESIGNER: Assignment = {
  steps: ["designer"],
  reason: "Laying out — it arranges what is already written",
};

/** The safe answer when a request cannot be read: touch the words, not the shape. */
export const WRITER_ONLY: Assignment = WRITER;

/** The assignment a surface implies, or `null` when it implies none. */
export function routeSurface(surface: Surface): Assignment | null {
  switch (surface.kind) {
    case "block-action":
      return surface.family === "turn-into" ? DESIGNER : WRITER;
    case "styling":
      return DESIGNER;
    case "rewording":
      return WRITER;
    default:
      return null;
  }
}

const ORDER: AgentId[] = ["writer", "designer"];

function isAgentId(value: unknown): value is AgentId {
  return ORDER.includes(value as AgentId);
}

/**
 * A router's answer, made safe. The words are settled before their box is
 * chosen, whatever order came back — a layout pass over a passage that is about
 * to be rewritten is a layout pass thrown away.
 */
export function readAssignment(answer: unknown): Assignment {
  const { steps, reason } = (answer ?? {}) as { steps?: unknown; reason?: unknown };
  const named = Array.isArray(steps) ? steps.filter(isAgentId) : [];
  const ordered = ORDER.filter((id) => named.includes(id));
  if (ordered.length === 0) return WRITER_ONLY;
  return {
    steps: ordered,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : reasonFor(ordered),
  };
}

function reasonFor(steps: AgentId[]): string {
  if (steps.length > 1) return "Rewriting, then laying out";
  return steps[0] === "designer" ? DESIGNER.reason : WRITER.reason;
}
