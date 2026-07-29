"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useCallback } from "react";
import { DocImage } from "@/infrastructure/editor/doc-image";
import { ImageBar, type ImagePlacement } from "./image/ImageBar";
import { useImageResize } from "./image/use-image-resize";

/** The image node wired to its React rendering — this is what the editor loads. */
export const ImageNode = DocImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export function ImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, width, align, caption } = node.attrs as ImagePlacement & { src: string };
  const setWidth = useCallback(
    (value: number) => updateAttributes({ width: value }),
    [updateAttributes],
  );
  const { resizing, handleProps } = useImageResize(width, align, setWidth);
  const editing = selected && editor.isEditable;

  return (
    <NodeViewWrapper
      as="figure"
      className="doc-image"
      data-selected={selected}
      data-align={align}
      data-resizing={resizing}
      // The figure carries the width, not the image: a float has to be as wide
      // as the picture inside it for the text to know where to flow.
      style={align === "full" ? undefined : { width: `${width}%` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- uploads are
          served raw by /api/uploads; next/image would add a second pipeline
          for no benefit and would not print any better. */}
      <img src={src} alt={alt ?? ""} />
      {caption && <figcaption>{caption}</figcaption>}

      {editing && (
        <span
          className="image-handle"
          contentEditable={false}
          title={`${width}% of the column`}
          {...handleProps}
        />
      )}
      {editing && (
        <ImageBar
          placement={{ alt, width, align, caption }}
          onChange={updateAttributes}
        />
      )}
    </NodeViewWrapper>
  );
}
