import { agentById } from "@/domain/authoring/agents/catalog";
import type { Agent, AgentId } from "@/domain/authoring/agents/contract";
import type { Assignment } from "@/domain/authoring/agents/routing";
import { charterBreach } from "@/domain/authoring/agents/charter-breach";
import { agentSystem, selectionBlocksPrompt } from "@/domain/authoring/prompts";
import { ModelUnavailable } from "@/domain/authoring/text-generator";
import type { DocumentNode } from "@/domain/documents/body";
import { effortFor, tokensFor } from "@/domain/authoring/thinking";
import { askOnce, blocksFromAnswer } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/**
 * Running an assignment: one assistant, then possibly the next (STEP U13).
 *
 * Each step edits the passage the step before it produced, so the words are
 * settled before their box is chosen. What each assistant may not do is checked
 * here rather than merely asked for in its charter: the failure is fed back
 * through the existing retry, and a layout pass that drifts twice is dropped
 * instead of applied — the passage the writer produced is worth more than a
 * layout that rewrote it.
 */

export interface AssignmentResult {
  readonly blocks: DocumentNode[];
  /** What the user was told would happen. */
  readonly reason: string;
  /** The assistants whose work is in `blocks`. */
  readonly ran: AgentId[];
  /** Steps dropped because they broke their charter, and why. */
  readonly refused: { agent: AgentId; because: string }[];
}

/**
 * One assistant over one passage, held to its charter.
 *
 * The charter is checked inside the reader rather than around the call: that is
 * where the existing retry lives, so a breach comes back to the model quoted as
 * the reason it must answer again. Checking afterwards would give it one chance
 * and no feedback.
 */
async function runAgent(
  deps: AuthoringDeps,
  agent: Agent,
  blocks: DocumentNode[],
  instruction: string,
): Promise<DocumentNode[]> {
  return askOnce(
    deps,
    {
      system: agentSystem(agent, deps.style),
      prompt: selectionBlocksPrompt(deps.writer.write(blocks), instruction),
      temperature: agent.temperature,
      effort: effortFor("passage"),
    maxTokens: tokensFor("passage"),
    },
    (text) => {
      const next = blocksFromAnswer(deps, text);
      const breach = charterBreach(agent, blocks, next);
      if (breach) throw new Error(breach);
      return next;
    },
  );
}

export async function runAssignment(
  deps: AuthoringDeps,
  assignment: Assignment,
  blocks: DocumentNode[],
  instruction: string,
): Promise<AssignmentResult> {
  let current = blocks;
  const ran: AgentId[] = [];
  const refused: { agent: AgentId; because: string }[] = [];

  for (const id of assignment.steps) {
    const agent = agentById(id);
    try {
      current = await runAgent(deps, agent, current, instruction);
      ran.push(id);
    } catch (err) {
      if (err instanceof ModelUnavailable || ran.length === 0) throw err;
      // A later step that failed costs its own work and nothing else: what the
      // step before produced is a complete, valid answer on its own.
      refused.push({ agent: id, because: err instanceof Error ? err.message : String(err) });
    }
  }

  return { blocks: current, reason: assignment.reason, ran, refused };
}
