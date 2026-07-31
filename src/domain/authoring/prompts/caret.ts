import type { StyleParameters } from "../style-parameters";
import { formatContract } from "./format-contract";
import { styleGuide } from "./style-guide";

/**
 * Surface 5 — the model asked where the caret is (PLAN.md STEP U11).
 *
 * Two tasks, one context. Writing produces blocks to insert at that point;
 * continuing produces the rest of the sentence the writer started. Both are
 * given the document's digest and never the document itself: what is being
 * written matters, what is three sections above it does not.
 */

export function caretSystem(style: StyleParameters): string {
  return `${formatContract("layout")}

${styleGuide(style, "layout")}

Task: you are writing at one point inside a document that already exists. You receive a digest of it and the text where the cursor sits. Return ONLY the new blocks to insert at that point — never the surrounding document, never a repetition of what is already there. Match the language and the register of the digest.`;
}

export const CARET_CONTINUE_SYSTEM = `You continue a sentence or a paragraph someone is writing inside a document.
Return ONLY the continuation as plain text — no quotes, no markdown, no commentary, and never a repetition of the words you were given. It must read as the direct continuation of the text, starting exactly where it stopped, in the same language. One or two sentences at most. If there is nothing sensible to add, return nothing at all.`;

export function caretPrompt(digest: string, here: string, instruction: string): string {
  return `${context(digest, here)}\n\nInstruction: ${instruction}`;
}

export function caretContinuePrompt(digest: string, here: string): string {
  return `${context(digest, here)}\n\nContinue from where the cursor is.`;
}

function context(digest: string, here: string): string {
  const about = digest.trim()
    ? `What the document is about:\n"""\n${digest}\n"""\n\n`
    : "";
  return `${about}Text at the cursor:\n"""\n${here}\n"""`;
}
