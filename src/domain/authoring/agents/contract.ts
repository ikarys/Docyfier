import type { StyleParameters } from "../style-parameters";

/**
 * The two assistants (PLAN.md STEP U13).
 *
 * One prompt cannot be good at two jobs: writing well and presenting well pull
 * in opposite directions, and when the result disappoints there is no way to
 * tell which half failed. So each assistant is declared here with one job, its
 * own charter and its own temperature, and the surfaces say which one they want.
 *
 * An agent is data, not behaviour: every one of them is run by the same use
 * case, against the same validator and the same formatting pass. A third
 * assistant is a file and a line in the catalog.
 */
export type AgentId = "writer" | "designer";

export interface Agent {
  readonly id: AgentId;
  /** What the user reads while it works — "Writing", "Laying out". */
  readonly label: string;
  /** Half a sentence naming its job, for the line that explains the routing. */
  readonly does: string;
  /**
   * Faithful work needs a cold model; prose needs a little room. The numbers
   * live with the agent because they are part of what it is.
   */
  readonly temperature: number;
  /** What this assistant is, prepended to the task of any surface it serves. */
  charter(style: StyleParameters): string;
}
