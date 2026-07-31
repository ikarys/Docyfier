/**
 * Prompt building for the AI surfaces (PLAN.md STEP 2).
 *
 * Four pieces, deliberately apart: the FORMAT CONTRACT says what the editor can
 * render, the STYLE GUIDE what a good document looks like, a RECIPE what a
 * given kind of document is made of, and the per-surface task tells the model
 * what to do with all three. All JSON-producing prompts share the format
 * contract so parsing and validation stay uniform.
 */

export { formatContract } from "./format-contract";
export { styleGuide } from "./style-guide";
export type { ContractScope } from "./scope";
export { agentSystem } from "./agents";
export { planPrompt, planSystem, restylePrompt } from "./plan";
export { writerSystem } from "./write";
export { transformOpsSystem, transformOpsPrompt } from "./transform";
export {
  SELECTION_TEXT_SYSTEM,
  selectionBlocksPrompt,
  selectionBlocksSystem,
  selectionTextPrompt,
} from "./selection";
export {
  CARET_CONTINUE_SYSTEM,
  caretContinuePrompt,
  caretPrompt,
  caretSystem,
} from "./caret";
export { QUESTION_SYSTEM, questionPrompt } from "./question";
export { retryPrompt } from "./retry";
