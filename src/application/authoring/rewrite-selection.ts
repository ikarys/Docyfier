import {
  fragmentFromAnswer,
  plainFromAnswer,
} from "@/domain/authoring/model-answer";
import {
  SELECTION_TEXT_SYSTEM,
  selectionBlocksPrompt,
  selectionBlocksSystem,
  selectionTextPrompt,
} from "@/domain/authoring/prompts";
import type { DocumentNode } from "@/domain/documents/body";
import { askDocument } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/** The surfaces that rewrite a selection, and the one the composers use. */

/** Surface 3a — multi-block selection rewrite; hands back replacement blocks. */
export async function rewriteSelectionBlocks(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  instruction: string,
): Promise<DocumentNode[]> {
  const body = await askDocument(deps, {
    system: selectionBlocksSystem(deps.style),
    prompt: selectionBlocksPrompt(blocks, instruction),
    temperature: 0.3,
    effort: "low",
  });
  return body.content ?? [];
}

/**
 * Surface 3b — inline selection rewrite. Plain text in, plain text out: the
 * result replaces a fragment mid-sentence, so quotes, fences and leftover
 * emphasis markers would land in the document as characters.
 */
export async function rewriteSelectionText(
  deps: AuthoringDeps,
  text: string,
  instruction: string,
): Promise<string> {
  const answer = await deps.generator.generate({
    system: SELECTION_TEXT_SYSTEM,
    prompt: selectionTextPrompt(text, instruction),
    temperature: 0.3,
    // Swapping one fragment mid-sentence: there is nothing here to deliberate.
    effort: "low",
    shape: "free",
  });
  return fragmentFromAnswer(answer.text);
}

/**
 * Surface 4 — the composers (PLAN.md STEP 8). Plain text in, plain text out:
 * these flows produce something to paste into another tool, not document JSON,
 * so none of the document validation applies.
 */
export async function completePlainText(
  deps: AuthoringDeps,
  system: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  const { text, truncated } = await deps.generator.generate({
    system,
    prompt,
    temperature,
    shape: "free",
  });
  if (truncated) {
    throw new Error(
      "The answer hit the output limit — shorten the input, or raise the token budget in Settings → AI providers.",
    );
  }
  return plainFromAnswer(text.trim());
}
