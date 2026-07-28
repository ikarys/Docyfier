import type { DocumentNode } from "@/domain/documents/body";
import { defaultBlock } from "./blocks";
import type { HtmlContext, HtmlDialect, HtmlOptions } from "./contract";
import { flattenText, renderInline } from "./inline";

/**
 * Semantic HTML rendering of a document.
 *
 * This is the shared substrate of the HTML-flavoured export targets: rich
 * paste into Confluence, Trilium notes, anything that eats a fragment.
 *
 * Targets that need their own markup for a block pass a `HtmlDialect` instead
 * of forking the walk: a dialect returns markup for the nodes it cares about
 * and `null` for the rest, which keeps the traversal, the escaping and the
 * inline marks in one place.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

export type { HtmlContext, HtmlDialect, HtmlOptions };
export { escapeHtml } from "./escape";
export { rawText } from "./inline";

function makeContext(dialect: HtmlDialect, options: HtmlOptions): HtmlContext {
  const url = (src: string): string => {
    const base = options.baseUrl?.replace(/\/+$/, "");
    return base && src.startsWith("/") ? `${base}${src}` : src;
  };

  const blocks = (nodes: DocumentNode[] | undefined): string =>
    (nodes ?? [])
      .map((node) => renderBlock(node, ctx, dialect))
      .filter((html) => html.trim().length > 0)
      .join("\n");

  const ctx: HtmlContext = {
    blocks,
    inline: (nodes) => renderInline(nodes, ctx),
    text: flattenText,
    url,
  };
  return ctx;
}

function renderBlock(
  node: DocumentNode,
  ctx: HtmlContext,
  dialect: HtmlDialect,
): string {
  const custom = dialect.block?.(node, ctx);
  return custom !== null && custom !== undefined ? custom : defaultBlock(node, ctx);
}

/** The document as an HTML fragment — no `<html>`, no wrapper element. */
export function docToHtml(
  doc: DocumentNode,
  dialect: HtmlDialect = {},
  options: HtmlOptions = {},
): string {
  return makeContext(dialect, options).blocks(doc.content);
}
