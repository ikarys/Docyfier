import type { DocumentNode } from "@/domain/documents/body";
import { outlineOf, type OutlineLine } from "@/domain/documents/diagram/outline";
import { isDiagramAttrs } from "@/domain/documents/diagram/validation";

/**
 * A stored diagram node as the lines the drawing-less targets print.
 *
 * Markdown, Jira and plain text each bullet them their own way, but reading the
 * node and deciding what survives is one piece of knowledge and has one home.
 * A node whose attrs no longer hold yields nothing rather than a broken list.
 */
export function diagramLines(node: DocumentNode): OutlineLine[] {
  const attrs = node.attrs ?? {};
  return isDiagramAttrs(attrs) ? outlineOf(attrs) : [];
}

export function diagramTexts(node: DocumentNode): { title: string | null; caption: string | null } {
  const { title, caption } = (node.attrs ?? {}) as {
    title?: string | null;
    caption?: string | null;
  };
  return { title: title ?? null, caption: caption ?? null };
}
