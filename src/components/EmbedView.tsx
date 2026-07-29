"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { isEmbedFrame } from "@/domain/documents/embed";
import { Embed } from "@/infrastructure/editor/embed";

/** The embed node wired to its React rendering — this is what the editor loads. */
export const EmbedNode = Embed.extend({
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
});

export function EmbedView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, href, provider, title } = node.attrs as {
    src: string;
    href: string;
    provider: string;
    title: string | null;
  };
  // The allowlist is asked again here: a document edited by hand must never
  // make the editor load a page nobody allowed.
  const framed = isEmbedFrame(src);

  return (
    <NodeViewWrapper
      as="figure"
      className="embed"
      data-selected={selected}
      data-framed={framed}
    >
      {framed && (
        <iframe
          src={src}
          title={title ?? provider}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      {/* Always written, never always shown: paper draws no frame, so this is
          what a printed document is left with. */}
      <a className="embed-fallback" href={href} target="_blank" rel="noreferrer noopener">
        {title || provider || href}
      </a>
      {title && <figcaption>{title}</figcaption>}

      {selected && editor.isEditable && (
        <div
          className="image-bar"
          contentEditable={false}
          onMouseDown={(e) => e.preventDefault()}
        >
          <span className="embed-provider">{provider}</span>
          <input
            className="image-alt"
            placeholder="Title"
            value={title ?? ""}
            // Empty means no title at all, not an empty line under the frame.
            onChange={(e) => updateAttributes({ title: e.target.value || null })}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
