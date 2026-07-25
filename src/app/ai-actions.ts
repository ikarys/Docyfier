"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { createDocument } from "@/lib/store";
import {
  generateDocument,
  transformDocument,
  rewriteSelectionBlocks,
  rewriteSelectionText,
  type TransformOutcome,
} from "@/lib/ai/service";

/** Server actions for the three AI surfaces (PLAN.md STEP 2). */

export type GenerateState = { error: string } | null;

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

/** Surface 1 — generate a document from a prompt, then open it. */
export async function generateDocumentAction(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  const prompt = String(formData.get("prompt") ?? "").trim();
  if (!prompt) return { error: "Describe the document you want first." };

  let content: JSONContent;
  try {
    content = await generateDocument(prompt);
  } catch (err) {
    return { error: message(err) };
  }

  const doc = await createDocument(content);
  revalidatePath("/");
  redirect(`/doc/${doc.id}`);
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
