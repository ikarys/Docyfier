import type { StyleParameters } from "../style-parameters";
import { formatContract } from "./format-contract";
import { styleGuide } from "./style-guide";

/** Surface 3 — rewriting what the user selected, as blocks or as bare text. */

export function selectionBlocksSystem(style: StyleParameters): string {
  return `${formatContract("layout")}

${styleGuide(style, "layout")}

Task: you receive an excerpt of a larger document (as a JSON doc) plus an instruction. Return a doc containing ONLY the rewritten replacement blocks for that excerpt — not the whole document, no extra sections. Keep the language of the excerpt.
When the instruction is about design ("make it pretty", "improve the design", "beautify"), UPGRADE the excerpt into the richest fitting visual block from the style guide — a statRow of deltas, a cardGrid, a timeline — never leave it as plain paragraphs or fall back to a bare table. Carry meaning with semantic accents/badges, never hardcoded hex colors (reserve textStyle/highlight hex only for an explicit user color request). "emphasis" → bold or badge marks.`;
}

export const SELECTION_TEXT_SYSTEM = `You rewrite text fragments inside a document.
Return ONLY the rewritten fragment as plain text — no quotes, no markdown, no commentary, no surrounding sentence. Keep the language of the fragment. It must fit grammatically where the original stood.`;

export function selectionBlocksPrompt(blocks: unknown[], instruction: string): string {
  return `Excerpt:\n${JSON.stringify({ type: "doc", content: blocks })}\n\nInstruction: ${instruction}`;
}

export function selectionTextPrompt(text: string, instruction: string): string {
  return `Fragment:\n"""\n${text}\n"""\n\nInstruction: ${instruction}`;
}
