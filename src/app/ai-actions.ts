"use server";

import { revalidatePath } from "next/cache";
import type { JSONContent } from "@tiptap/core";
import { createDocument, updateDocument } from "@/lib/store";
import {
  generateDocument,
  transformDocument,
  rewriteSelectionBlocks,
  rewriteSelectionText,
  type TransformOutcome,
} from "@/lib/ai/service";

/** Server actions for the three AI surfaces (PLAN.md STEP 2). */

export type GenerateResult =
  | { ok: true; content: JSONContent }
  | { ok: false; error: string };

export type TransformResult =
  | { ok: true; outcome: TransformOutcome }
  | { ok: false; error: string };

export type SelectionInput =
  | { mode: "text"; text: string; instruction: string }
  | { mode: "blocks"; blocks: JSONContent[]; instruction: string };

export type SelectionResult =
  | { ok: true; mode: "text"; text: string }
  | { ok: true; mode: "blocks"; blocks: JSONContent[] }
  | { ok: false; error: string };

function message(err: unknown): string {
  return err instanceof Error ? err.message : "AI request failed";
}

/**
 * Surface 1, step 1 — the document the generation will stream into.
 *
 * Created empty and up front so the user lands in the editor immediately; the
 * editor deletes it again if the stream dies before producing anything.
 */
export async function startGeneratedDocumentAction(): Promise<string> {
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
  const trimmed = prompt.trim();
  if (!trimmed) return { ok: false, error: "Describe the document you want first." };
  try {
    const content = await generateDocument(trimmed);
    await updateDocument(id, content);
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Surface 2 — whole-document transform from the side panel. */
export async function transformDocumentAction(
  content: JSONContent,
  instruction: string,
): Promise<TransformResult> {
  const trimmed = instruction.trim();
  if (!trimmed) return { ok: false, error: "Empty instruction" };
  try {
    return { ok: true, outcome: await transformDocument(content, trimmed) };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}

/** Surface 3 — rewrite the current selection (inline text or whole blocks). */
export async function rewriteSelectionAction(
  input: SelectionInput,
): Promise<SelectionResult> {
  const instruction = input.instruction.trim();
  if (!instruction) return { ok: false, error: "Empty instruction" };
  try {
    if (input.mode === "text") {
      const text = await rewriteSelectionText(input.text, instruction);
      return { ok: true, mode: "text", text };
    }
    const blocks = await rewriteSelectionBlocks(input.blocks, instruction);
    return { ok: true, mode: "blocks", blocks };
  } catch (err) {
    return { ok: false, error: message(err) };
  }
}
