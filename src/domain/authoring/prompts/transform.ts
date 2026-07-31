import type { Agent } from "../agents/contract";
import type { StyleParameters } from "../style-parameters";
import { formatContract } from "./format-contract";
import { styleGuide } from "./style-guide";

/** Surface 2 — editing an existing document through a list of operations. */

const OPS_CONTRACT = `You are editing an EXISTING document by returning a list of operations, not a new document.

OUTPUT RULES — these REPLACE the output rules above:
- Output ONE JSON array and nothing else. No markdown fences, no commentary.
- Each element is one of:
  {"op":"replace","index":N,"blocks":"..."} — swap the block at index N for the blocks written in "blocks"
  {"op":"replace","index":N,"through":M,"blocks":"..."} — swap blocks N to M INCLUSIVE for them
  {"op":"insert_after","index":N,"blocks":"..."} — add them right after the block at index N
  {"op":"delete","index":N} — remove the block at index N
- "blocks" is a STRING holding the new blocks in the document format described
  above — markdown and \`:::\` blocks — with newlines written as \\n, exactly as
  JSON requires. It is never an array and never a JSON node.
- To gather several blocks into one — three paragraphs into a cardGrid, four
  rows into a statRow — use ONE replace with "through". Never a replace followed
  by deletes of the blocks it absorbed: that is read as throwing them away, and
  is refused.
- "index" refers to the numbering of the document you were given, ALWAYS the
  original numbering: never renumber for edits you made earlier in the list.
- The block rules, the layout nesting rules and the style guide all still apply
  to what "blocks" holds.
- Touch ONLY what the instruction concerns. Every block you do not name stays as
  it is; there is no op for "unchanged", so simply leave it out.
- To append at the end of the document, use "insert_after" on the last index.
- Return [] when the instruction asks for nothing that changes the document.`;

/**
 * `agent` is which assistant is editing (PLAN.md STEP U13), and it carries the
 * vocabulary it is allowed to work in. No agent is the single-prompt behaviour
 * every surface had before the split, kept because a caller from before it
 * still exists — and it sees the whole contract, because it may produce
 * anything.
 */
export function transformOpsSystem(style: StyleParameters, agent?: Agent): string {
  const scope = agent ? agent.scope : "document";
  return `${formatContract(scope)}

${styleGuide(style, scope)}

${OPS_CONTRACT}${agent ? `\n\n${agent.charter(style)}` : ""}

Task: you receive the current document as a numbered list of its top-level blocks, plus an instruction. Return the operations that carry out the instruction.
When the instruction is about design ("make it pretty", "improve the design", "beautify", "modernize"), do not just tweak colors or spacing — actively RESTRUCTURE per the style guide above: replace plain tables of standalone metrics with a statRow, parallel items with a cardGrid, chronological content with a timeline, sequential steps with a stepList. Go section by section and emit a "replace" op wherever a richer fitting block exists; a document that comes out with the same kinds of block it went in has not been made pretty.`;
}

/**
 * The document as one numbered entry per top-level block — the addressing the
 * op contract works against.
 *
 * A block is written in the document format, so it can run to several lines; a
 * `[N]` marker on its own line opens each one, since a numbered prefix would be
 * read as a list by a model that has just been told markdown.
 */
export function transformOpsPrompt(written: string[], instruction: string): string {
  const numbered = written.map((block, i) => `[${i}]\n${block}`).join("\n\n");
  return `Current document, block by block:\n${numbered}\n\nInstruction: ${instruction}`;
}
