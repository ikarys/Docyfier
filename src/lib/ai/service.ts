import "server-only";
import type { JSONContent } from "@tiptap/core";
import type { AuthoringDeps } from "@/application/authoring/deps";
import {
  completePlainText as completeText,
  rewriteSelectionBlocks as rewriteBlocks,
  rewriteSelectionText as rewriteText,
} from "@/application/authoring/rewrite-selection";
import {
  planDocument as planBrief,
  restyleDocument as chooseDress,
} from "@/application/authoring/plan-document";
import {
  generateDocument as writeDocument,
  transformDocument as editDocument,
  type TransformOutcome,
} from "@/application/authoring/write-documents";
import { themeFromArt } from "@/application/documents/theme-from-art";
import type { DocumentBrief } from "@/domain/authoring/brief";
import type { DocumentNode } from "@/domain/documents/body";
import type { DocumentTheme } from "@/domain/documents/theme";
import { artVocabulary } from "@/lib/ai/art-vocabulary";
import { createOpenAiCompatibleGenerator } from "@/infrastructure/authoring/openai-compatible/generator";
import { activeEndpoint } from "@/lib/ai/provider";
import { getStyleParameters } from "@/lib/settings/style";
import { beautify } from "@/domain/authoring/beautify";
import { validateDocJson } from "@/infrastructure/editor/schema";

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

async function deps(): Promise<AuthoringDeps> {
  const style = await getStyleParameters();
  return {
    generator: createOpenAiCompatibleGenerator(activeEndpoint),
    validator: { validate: validateDocJson },
    polisher: { polish: (body) => beautify(body, style) },
    style,
  };
}

/**
 * Surface 1, planning pass — what kind of document this is and how it should be
 * dressed. Exposed on its own because the streaming route needs the brief
 * before it opens the writing stream.
 */
export async function planDocument(prompt: string): Promise<DocumentBrief> {
  return planBrief(await deps(), prompt, artVocabulary());
}

/** A written document and the dress its plan chose for it. */
export interface WrittenDocument {
  content: JSONContent;
  /** Null when the plan proposed nothing usable: the document keeps its own. */
  theme: DocumentTheme | null;
}

/** Surface 1 — prompt-to-document, planned then written. */
export async function generateDocument(prompt: string): Promise<WrittenDocument> {
  const authoring = await deps();
  const brief = await planBrief(authoring, prompt, artVocabulary());
  return {
    content: await writeDocument(authoring, prompt, brief),
    theme: themeFromArt(brief.art),
  };
}

/** Surface 2 — whole-document transform (side panel, "make it pretty"). */
export async function transformDocument(
  doc: JSONContent,
  instruction: string,
): Promise<TransformOutcome> {
  return editDocument(await deps(), doc, instruction);
}

/**
 * Surface 1, on a document that already exists — "style for me". Answers the
 * theme it should wear, or null when the model proposed nothing usable. The
 * content is read, never written.
 */
export async function restyleDocument(doc: JSONContent): Promise<DocumentTheme | null> {
  return themeFromArt(await chooseDress(await deps(), doc, artVocabulary()));
}

/** Surface 3a — multi-block selection rewrite; returns replacement blocks. */
export async function rewriteSelectionBlocks(
  blocks: JSONContent[],
  instruction: string,
): Promise<DocumentNode[]> {
  return rewriteBlocks(await deps(), blocks, instruction);
}

/** Surface 3b — inline selection rewrite; plain text in, plain text out. */
export async function rewriteSelectionText(
  text: string,
  instruction: string,
): Promise<string> {
  return rewriteText(await deps(), text, instruction);
}

/** Surface 4 — the composers (PLAN.md STEP 8): plain text in, plain text out. */
export async function completePlainText(
  system: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  return completeText(await deps(), system, prompt, temperature);
}
