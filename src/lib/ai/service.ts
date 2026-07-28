import "server-only";
import type { JSONContent } from "@tiptap/core";
import type { AuthoringDeps } from "@/application/authoring/deps";
import {
  completePlainText as completeText,
  rewriteSelectionBlocks as rewriteBlocks,
  rewriteSelectionText as rewriteText,
} from "@/application/authoring/rewrite-selection";
import {
  generateDocument as writeDocument,
  transformDocument as editDocument,
  type TransformOutcome,
} from "@/application/authoring/write-documents";
import type { DocumentNode } from "@/domain/documents/body";
import { createOpenAiCompatibleGenerator } from "@/infrastructure/authoring/openai-compatible/generator";
import { activeEndpoint } from "@/lib/ai/provider";
import { beautify } from "@/lib/doc/beautify";
import { validateDocJson } from "./doc-schema";

/**
 * Composition root for the AI surfaces.
 *
 * The use cases (`src/application/authoring/`) take their model, their validator
 * and their formatting pass as arguments; this is the one module that decides
 * what those are in a running app — the configured OpenAI-compatible endpoint,
 * the editor's own schema, and `beautify`. Server actions and routes call these
 * functions and never see the SDK.
 */

export type { TransformOutcome };

function deps(): AuthoringDeps {
  return {
    generator: createOpenAiCompatibleGenerator(activeEndpoint),
    validator: { validate: validateDocJson },
    polisher: { polish: beautify },
  };
}

/** Surface 1 — prompt-to-document. */
export function generateDocument(prompt: string): Promise<JSONContent> {
  return writeDocument(deps(), prompt);
}

/** Surface 2 — whole-document transform (side panel, "make it pretty"). */
export function transformDocument(
  doc: JSONContent,
  instruction: string,
): Promise<TransformOutcome> {
  return editDocument(deps(), doc, instruction);
}

/** Surface 3a — multi-block selection rewrite; returns replacement blocks. */
export function rewriteSelectionBlocks(
  blocks: JSONContent[],
  instruction: string,
): Promise<DocumentNode[]> {
  return rewriteBlocks(deps(), blocks, instruction);
}

/** Surface 3b — inline selection rewrite; plain text in, plain text out. */
export function rewriteSelectionText(
  text: string,
  instruction: string,
): Promise<string> {
  return rewriteText(deps(), text, instruction);
}

/** Surface 4 — the composers (PLAN.md STEP 8): plain text in, plain text out. */
export function completePlainText(
  system: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  return completeText(deps(), system, prompt, temperature);
}
