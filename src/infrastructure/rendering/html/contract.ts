import type { DocumentNode } from "@/domain/documents/body";

/**
 * What the HTML walk hands to every renderer, and what a target may override.
 *
 * The context is the only way a block renderer reaches the rest of the
 * document: it never calls the walk directly, so a dialect that replaces one
 * node still gets the shared escaping, inline marks and URL rewriting.
 */

export interface HtmlContext {
  /** Render a list of block nodes. */
  blocks(nodes: DocumentNode[] | undefined): string;
  /** Render inline content (text + marks). */
  inline(nodes: DocumentNode[] | undefined): string;
  /** Flatten a node to text, marks and structure dropped. */
  text(node: DocumentNode): string;
  /** Rewrite a document-relative URL for a reader outside this instance. */
  url(src: string): string;
}

export interface HtmlDialect {
  /** Markup for a node, or `null` to take the default rendering. */
  block?(node: DocumentNode, ctx: HtmlContext): string | null;
}

export interface HtmlOptions {
  /** Absolute origin prepended to `/api/uploads/…` sources. Without it the
   * images stay relative and only resolve inside this instance. */
  baseUrl?: string;
}
