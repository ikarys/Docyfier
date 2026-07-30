"use server";

import { requireAuth } from "@/lib/auth";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/core";
import { createDocument, updateDocument } from "@/lib/store";
import type { DocumentTheme } from "@/lib/themes";
import {
  askAboutDocument,
  continueWriting,
  editPassage,
  generateDocument,
  restyleDocument,
  transformDocument,
  rewriteSelectionText,
  writeAtCaret,
  type CaretContext,
  type DocumentAnswer,
  type TransformOutcome,
} from "@/lib/ai/service";
import type { AssignmentResult } from "@/application/authoring/run-assignment";
import type { Surface } from "@/domain/authoring/agents/routing";

/** Server actions for the three AI surfaces (PLAN.md STEP 2). */

export type GenerateResult =
  | { ok: true; content: JSONContent; theme: DocumentTheme | null }
  | { ok: false; error: string };

export type TransformResult =
  | { ok: true; outcome: TransformOutcome }
  | { ok: false; error: string };

export type RestyleResult =
  | { ok: true; theme: DocumentTheme }
  | { ok: false; error: string };

export type SelectionInput =
  | { mode: "text"; text: string; instruction: string }
  | {
      mode: "blocks";
      blocks: JSONContent[];
      instruction: string;
      /** What the user did, so the assistants can be chosen without a call. */
      surface: Surface;
    };

export type CaretResult =
  | { ok: true; blocks: JSONContent[] }
  | { ok: false; error: string };

export type ContinuationResult =
  | { ok: true; text: string | null }
  | { ok: false; error: string };

export type AnswerResult =
  | { ok: true; answer: DocumentAnswer }
  | { ok: false; error: string };

export type SelectionResult =
  | { ok: true; mode: "text"; text: string }
  | {
      ok: true;
      mode: "blocks";
      blocks: JSONContent[];
      /** Which assistants worked, in the words the user is shown. */
      reason: string;
      /** A step dropped because it broke its charter — worth saying, not worth
       * failing the answer the other assistant already produced. */
      note: string | null;
    }
  | { ok: false; error: string };

function message(err: unknown): string {
  return err instanceof Error ? err.message : "AI request failed";
}

/**
 * What to tell the user about a step that was dropped. The reason the model
 * gave is written for the model; what belongs on screen is which assistant gave
 * up, so the result reads as deliberate rather than as half a feature.
 */
function noteOf(result: AssignmentResult): string | null {
  const dropped = result.refused[0];
  if (!dropped) return null;
  return dropped.agent === "designer"
    ? "The layout assistant kept rewriting the text, so its pass was dropped — the wording is the one you see."
    : "One assistant could not answer; what you see is the rest of the work.";
}

/**
 * Surface 1, step 1 — the document the generation will stream into.
 *
 * Created empty and up front so the user lands in the editor immediately; the
 * editor deletes it again if the stream dies before producing anything.
 */
export async function startGeneratedDocumentAction(): Promise<string> {
  await requireAuth();
  const doc = await createDocument();
  revalidatePath("/");
  return doc.id;
}

/**
 * Surface 1, fallback — blocking generation into an existing document, for
 * providers whose streaming the route handler could not open.
 */
export async function fillDocumentAction(
  id: string,
  prompt: string,
): Promise<GenerateResult> {
  await requireAuth();
  const trimmed = prompt.trim();
  if (!trimmed) return { ok: false, error: "Describe the document you want first." };
  try {
    const { content, theme } = await generateDocument(trimmed);
    await updateDocument(id, content);
    // The theme travels back rather than being written here: the editor applies
    // and persists it through the same path the streamed one takes.
    return { ok: true, content, theme };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Surface 2 — whole-document transform from the side panel. */
export async function transformDocumentAction(
  content: JSONContent,
  instruction: string,
): Promise<TransformResult> {
  await requireAuth();
  const trimmed = instruction.trim();
  if (!trimmed) return { ok: false, error: "Empty instruction" };
  try {
    return { ok: true, outcome: await transformDocument(content, trimmed) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/**
 * "Style for me" — the model reads the document and answers the theme it should
 * wear. The document itself is never written: the editor applies the theme
 * through the same path the Design panel uses.
 */
export async function restyleDocumentAction(
  content: JSONContent,
): Promise<RestyleResult> {
  await requireAuth();
  try {
    const theme = await restyleDocument(content);
    return theme
      ? { ok: true, theme }
      : { ok: false, error: "The AI had no styling to suggest for this document." };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/**
 * Surface 5, fallback — the blocks to insert at the caret, for a provider whose
 * stream the route handler could not open.
 */
export async function writeAtCaretAction(
  context: CaretContext,
  instruction: string,
): Promise<CaretResult> {
  await requireAuth();
  const trimmed = instruction.trim();
  if (!trimmed) return { ok: false, error: "Empty instruction" };
  try {
    return { ok: true, blocks: await writeAtCaret(context, trimmed) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Surface 5b — the continuation offered as ghost text. */
export async function continueWritingAction(
  context: CaretContext,
): Promise<ContinuationResult> {
  await requireAuth();
  try {
    return { ok: true, text: await continueWriting(context) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/**
 * Surface 6 — a question about the document. The document is never written by
 * this action: the answer travels back and the editor decides what becomes of
 * it.
 */
export async function askAboutDocumentAction(
  digest: string,
  question: string,
): Promise<AnswerResult> {
  await requireAuth();
  const trimmed = question.trim();
  if (!trimmed) return { ok: false, error: "Empty question" };
  try {
    return { ok: true, answer: await askAboutDocument(digest, trimmed) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Surface 3 — rewrite the current selection (inline text or whole blocks). */
export async function rewriteSelectionAction(
  input: SelectionInput,
): Promise<SelectionResult> {
  await requireAuth();
  const instruction = input.instruction.trim();
  if (!instruction) return { ok: false, error: "Empty instruction" };
  try {
    if (input.mode === "text") {
      // An inline fragment has no shape to give it: the writer is the only
      // assistant a run of text inside a sentence can be handed to.
      const text = await rewriteSelectionText(input.text, instruction);
      return { ok: true, mode: "text", text };
    }
    const result = await editPassage(input.surface, input.blocks, instruction);
    return {
      ok: true,
      mode: "blocks",
      blocks: result.blocks as JSONContent[],
      reason: result.reason,
      note: noteOf(result),
    };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
