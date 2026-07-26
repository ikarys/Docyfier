"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  renameDocument,
  setDocumentTheme,
  updateDocument,
} from "@/lib/store";
import { findTemplate } from "@/lib/templates";
import type { DocumentTheme } from "@/lib/themes";

/** Create a blank document and open it in the editor. */
export async function newDocumentAction(): Promise<void> {
  const doc = await createDocument();
  revalidatePath("/");
  redirect(`/doc/${doc.id}`);
}

/** Create a document from a template and open it in the editor. An unknown id
 * falls back to a blank document rather than failing the navigation. */
export async function createFromTemplateAction(
  templateId: string,
): Promise<void> {
  const template = findTemplate(templateId);
  const doc = template
    ? await createDocument(structuredClone(template.content), {
        preset: template.preset,
      })
    : await createDocument();
  revalidatePath("/");
  redirect(`/doc/${doc.id}`);
}

/** Persist editor content. Returns the derived title and save time for the UI.
 *
 * No `revalidatePath` here: the document list is `force-dynamic`, so it already
 * reads fresh on every visit, while revalidating from an autosave made Next
 * re-render and ship the current document page back on every keystroke. */
export async function saveDocumentAction(
  id: string,
  content: JSONContent,
): Promise<{ title: string; updatedAt: string } | null> {
  const updated = await updateDocument(id, content);
  if (!updated) return null;
  return { title: updated.title, updatedAt: updated.updatedAt };
}

/** Persist the document's presentation theme (content untouched).
 *
 * `theme` is validated by `normalizeTheme` inside the store, so a stale client
 * sending the legacy string form — or garbage — still lands a valid theme. */
export async function setDocumentThemeAction(
  id: string,
  theme: DocumentTheme,
): Promise<boolean> {
  const updated = await setDocumentTheme(id, theme);
  return updated !== null;
}

/** Rename a document from the list. An empty title hands the name back to the
 * content, so a cleared field is not a way to lose the document. */
export async function renameDocumentAction(
  id: string,
  title: string,
): Promise<string | null> {
  const updated = await renameDocument(id, title);
  if (!updated) return null;
  revalidatePath("/");
  return updated.title;
}

/** Duplicate a document; the copy is independent of its source. */
export async function duplicateDocumentAction(id: string): Promise<boolean> {
  const copy = await duplicateDocument(id);
  revalidatePath("/");
  return copy !== null;
}

/** Delete a document and return to the list. */
export async function deleteDocumentAction(id: string): Promise<void> {
  await deleteDocument(id);
  revalidatePath("/");
  redirect("/");
}
