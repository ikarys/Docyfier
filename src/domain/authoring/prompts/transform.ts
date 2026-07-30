import type { StyleParameters } from "../style-parameters";
import { FORMAT_CONTRACT } from "./format-contract";
import { styleGuide } from "./style-guide";

/** Surface 2 — editing an existing document through a list of operations. */

const OPS_CONTRACT = `You are editing an EXISTING document by returning a list of operations, not a new document.

OUTPUT RULES — these REPLACE the "one JSON object" rule above:
- Output ONE JSON array and nothing else. No markdown fences, no commentary.
- Each element is one of:
  {"op":"replace","index":N,"blocks":[ ...block nodes... ]} — swap the block at index N for these blocks (one or several)
  {"op":"insert_after","index":N,"blocks":[ ...block nodes... ]} — add these blocks right after the block at index N
  {"op":"delete","index":N} — remove the block at index N
- "index" refers to the numbering of the document you were given, ALWAYS the
  original numbering: never renumber for edits you made earlier in the list.
- "blocks" holds the same block nodes described above — the block rules, the
  layout nesting rules and the style guide all still apply.
- Touch ONLY what the instruction concerns. Every block you do not name stays as
  it is; there is no op for "unchanged", so simply leave it out.
- To append at the end of the document, use "insert_after" on the last index.
- Return [] when the instruction asks for nothing that changes the document.`;

/**
 * `charter` is which assistant is editing (PLAN.md STEP U13). Empty is the
 * single-prompt behaviour every surface had before the split, kept because the
 * generation path still uses it.
 */
export function transformOpsSystem(style: StyleParameters, charter = ""): string {
  return `${FORMAT_CONTRACT}

${styleGuide(style)}

${OPS_CONTRACT}${charter ? `\n\n${charter}` : ""}

Task: you receive the current document as a numbered list of its top-level blocks, plus an instruction. Return the operations that carry out the instruction.
When the instruction is about design ("make it pretty", "improve the design", "beautify", "modernize"), do not just tweak colors or spacing — actively RESTRUCTURE per the style guide above: replace plain tables of standalone metrics with a statRow, parallel items with a cardGrid, chronological content with a timeline, sequential steps with a stepList. Go section by section and emit a "replace" op wherever a richer fitting block exists; a document that comes out with the same node types it went in has not been made pretty.`;
}

/** The document as one numbered line per top-level block — the addressing the
 * op contract works against. */
export function transformOpsPrompt(blocks: unknown[], instruction: string): string {
  const numbered = blocks.map((block, i) => `${i}: ${JSON.stringify(block)}`).join("\n");
  return `Current document, one top-level block per line:\n${numbered}\n\nInstruction: ${instruction}`;
}
