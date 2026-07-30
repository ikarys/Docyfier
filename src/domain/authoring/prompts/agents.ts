import type { StyleParameters } from "../style-parameters";
import { FORMAT_CONTRACT } from "./format-contract";
import { styleGuide } from "./style-guide";

/**
 * The frame both assistants work in (PLAN.md STEP U13).
 *
 * What differs between them is their charter, which they declare themselves;
 * what they share is everything a passage-level edit needs — what the editor
 * can render, how this instance writes, and the promise to return only the
 * blocks that replace the passage.
 */
export function agentSystem(charter: string, style: StyleParameters): string {
  return `${FORMAT_CONTRACT}

${styleGuide(style)}

${charter}

Task: you receive an excerpt of a document (as a JSON doc) plus an instruction. Return a doc containing ONLY the blocks that replace that excerpt — never the whole document, never an extra section.`;
}
