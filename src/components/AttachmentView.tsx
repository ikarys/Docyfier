"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { attachmentLabel } from "@/domain/documents/attachment";
import { Attachment } from "@/infrastructure/editor/attachment";

/** The attachment node wired to its React rendering. */
export const AttachmentNode = Attachment.extend({
  addNodeView() {
    return ReactNodeViewRenderer(AttachmentView);
  },
});

export function AttachmentView({ node, selected }: NodeViewProps) {
  const { href, name, size } = node.attrs as { href: string; name: string; size: number };

  return (
    <NodeViewWrapper as="div" className="attachment-row" data-selected={selected}>
      <a
        className="attachment"
        href={href}
        // The upload route hands every non-image over as a download, so this
        // opens nothing in the page it was written on.
        target="_blank"
        rel="noreferrer noopener"
      >
        <span className="attachment-icon" aria-hidden="true">
          ⇩
        </span>
        {attachmentLabel(name, size)}
      </a>
    </NodeViewWrapper>
  );
}
