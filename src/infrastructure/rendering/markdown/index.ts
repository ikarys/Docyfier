import type { DocumentNode } from "@/domain/documents/body";
import { blocksToMarkdown } from "./blocks";

/**
 * Markdown export (PLAN.md STEP 3).
 *
 * Markdown has no cards, stats, timelines or charts, so the rich blocks are
 * projected onto the closest standard construct — a chart becomes the table of
 * its own data, a statRow a list of figures — and never dropped: the content
 * survives the export even when the layout cannot. Presentation-only nodes
 * (cover chrome, table of contents, page breaks) are the exception; they carry
 * nothing a reader would miss in a text file.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

/** The document as markdown, ending with a single newline. */
export function docToMarkdown(doc: DocumentNode): string {
  return `${blocksToMarkdown(doc.content ?? [])}\n`;
}

/** A safe `.md` filename for a document title. */
export function markdownFilename(title: string): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "document";
  return `${base}.md`;
}
