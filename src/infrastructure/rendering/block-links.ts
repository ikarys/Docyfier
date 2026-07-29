import type { DocumentNode } from "@/domain/documents/body";
import { attachmentLabel } from "@/domain/documents/attachment";

/**
 * The blocks that become a link everywhere but the editor: an embedded page,
 * which no target can frame, and an attached file, whose bytes stay on this
 * instance. A dead frame is worse than a link, so every renderer writes the
 * same one — and writes it from here.
 */

export interface BlockLink {
  readonly label: string;
  readonly href: string;
}

export function embedLink(node: DocumentNode): BlockLink {
  const { href, provider, title } = (node.attrs ?? {}) as {
    href?: string;
    provider?: string;
    title?: string | null;
  };
  return { label: title || provider || href || "Embedded page", href: href ?? "" };
}

export function attachmentLink(node: DocumentNode): BlockLink {
  const { href, name, size } = (node.attrs ?? {}) as {
    href?: string;
    name?: string;
    size?: number;
  };
  return { label: attachmentLabel(name ?? "", Number(size ?? -1)), href: href ?? "" };
}
