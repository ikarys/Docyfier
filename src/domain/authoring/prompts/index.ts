/**
 * Prompt building for the AI surfaces (PLAN.md STEP 2).
 *
 * Four pieces, deliberately apart: the FORMAT CONTRACT says what the editor can
 * render, the STYLE GUIDE what a good document looks like, a RECIPE what a
 * given kind of document is made of, and the per-surface task tells the model
 * what to do with all three. All JSON-producing prompts share the format
 * contract so parsing and validation stay uniform.
 */

export { FORMAT_CONTRACT } from "./format-contract";
export { STYLE_GUIDE } from "./style-guide";
export { GENERATE_SYSTEM } from "./write";
export { TRANSFORM_OPS_SYSTEM, transformOpsPrompt } from "./transform";
export {
  SELECTION_BLOCKS_SYSTEM,
  SELECTION_TEXT_SYSTEM,
  selectionBlocksPrompt,
  selectionTextPrompt,
} from "./selection";
export { retryPrompt } from "./retry";
