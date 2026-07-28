import { Document } from "@/domain/documents/document";
import type { BrandDeps, DocumentDeps } from "./deps";
import { getDocument } from "./read-documents";

/**
 * The commands on a document. Each one is the same three steps — load, ask the
 * entity for the next state, store it — because every rule about *what* changes
 * belongs to `Document`, and every rule about *where* it is kept belongs to the
 * repository. What is left here is the order.
 *
 * A command on an id that does not exist returns `null` rather than throwing:
 * a document deleted in another tab is an ordinary outcome, not a fault.
 */

/** Persist a new state of an existing document, or nothing if it is gone. */
async function update(
  deps: DocumentDeps,
  id: string,
  next: (document: Document) => Document,
): Promise<Document | null> {
  const existing = await getDocument(deps, id);
  if (!existing) return null;
  const updated = next(existing);
  await deps.repository.put(updated.toRecord());
  return updated;
}

/**
 * A document with no theme of its own wears the instance's (PLAN.md STEP 9).
 * A caller that names one — a template, an art direction — keeps it: the brand
 * is the default, not an override.
 */
export async function createDocument(
  deps: DocumentDeps & BrandDeps,
  input: { body?: unknown; theme?: unknown } = {},
): Promise<Document> {
  const document = Document.create({
    id: deps.ids.next(),
    now: deps.clock.now(),
    body: input.body,
    theme: input.theme ?? (await deps.brand.load()).themeForNewDocument(),
  });
  await deps.repository.put(document.toRecord());
  return document;
}

/** Persist edited content. The title follows it unless a rename froze it. */
export function saveDocument(
  deps: DocumentDeps,
  id: string,
  body: unknown,
): Promise<Document | null> {
  return update(deps, id, (document) => document.withBody(body, deps.clock.now()));
}

/** Rename. An empty title hands the name back to the content. */
export function renameDocument(
  deps: DocumentDeps,
  id: string,
  title: string,
): Promise<Document | null> {
  return update(deps, id, (document) => document.rename(title, deps.clock.now()));
}

/** Change the presentation theme; content is untouched. */
export function setDocumentTheme(
  deps: DocumentDeps,
  id: string,
  theme: unknown,
): Promise<Document | null> {
  return update(deps, id, (document) => document.withTheme(theme, deps.clock.now()));
}

/** Copy a document under a new id. The copy is independent of its source. */
export async function duplicateDocument(
  deps: DocumentDeps,
  id: string,
): Promise<Document | null> {
  const source = await getDocument(deps, id);
  if (!source) return null;
  const copy = source.duplicateAs(deps.ids.next(), deps.clock.now());
  await deps.repository.put(copy.toRecord());
  return copy;
}

export async function deleteDocument(deps: DocumentDeps, id: string): Promise<void> {
  await deps.repository.remove(id);
}
