"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { DocImage } from "@/infrastructure/editor/doc-image";
import { ImageBar, type ImagePlacement } from "./image/ImageBar";

/** The image node wired to its React rendering — this is what the editor loads. */
export const ImageNode = DocImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export function ImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, width, align, caption } = node.attrs as ImagePlacement & { src: string };

  return (
    <NodeViewWrapper
      as="figure"
      className="doc-image"
      data-selected={selected}
      data-align={align}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploads are
          served raw by /api/uploads; next/image would add a second pipeline
          for no benefit and would not print any better. */}
      <img src={src} alt={alt ?? ""} style={{ width: `${width}%` }} />
      {caption && <figcaption>{caption}</figcaption>}

      {selected && editor.isEditable && (
        <ImageBar
          placement={{ alt, width, align, caption }}
          onChange={updateAttributes}
        />
      )}
    </NodeViewWrapper>
  );
}
