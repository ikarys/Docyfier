import type { Agent } from "../agents/contract";
import type { StyleParameters } from "../style-parameters";
import { formatContract } from "./format-contract";
import { styleGuide } from "./style-guide";

/**
 * The frame both assistants work in (PLAN.md STEP U13).
 *
 * What differs between them is their charter — and, now that the contract is
 * sized per surface, the vocabulary that charter is written in: the writer is
 * not shown the blocks it is told never to produce. What they share is the rest
 * of what a passage-level edit needs, and the promise to return only the blocks
 * that replace the passage.
 */
export function agentSystem(agent: Agent, style: StyleParameters): string {
  return `${formatContract(agent.scope)}

${styleGuide(style, agent.scope)}

${agent.charter(style)}

Task: you receive an excerpt of a document plus an instruction. Return ONLY the blocks that replace that excerpt — never the whole document, never an extra section.`;
}
