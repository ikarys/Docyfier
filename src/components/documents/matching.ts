import type { DocumentSummary } from "@/domain/documents/repository";

/**
 * The documents a search box is asking for.
 *
 * Titles are what people remember, so that is all this looks at — matched on a
 * trimmed, case-folded substring, because someone typing "report" is not
 * telling us where in the title it sits.
 */
export function matchingDocuments(
  docs: DocumentSummary[],
  query: string,
): DocumentSummary[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return docs;
  return docs.filter((doc) => doc.title.toLowerCase().includes(needle));
}
