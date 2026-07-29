import type { DocumentNode } from "@/domain/documents/body";

/**
 * What an embed becomes everywhere no frame can be drawn — which is every
 * target but the editor itself. A dead frame is worse than a link, so each
 * renderer writes the same titled link, and writes it from here.
 */
export function embedLink(node: DocumentNode): { label: string; href: string } {
  const { href, provider, title } = (node.attrs ?? {}) as {
    href?: string;
    provider?: string;
    title?: string | null;
  };
  return { label: title || provider || href || "Embedded page", href: href ?? "" };
}
