"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { DocImage, IMAGE_WIDTHS } from "@/infrastructure/editor/doc-image";

/** The image node wired to its React rendering — this is what the editor loads. */
export const ImageNode = DocImage.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
});

export function ImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, alt, width, caption } = node.attrs as {
    src: string;
    alt: string | null;
    width: number;
    caption: string | null;
  };

  return (
    <NodeViewWrapper as="figure" className="doc-image" data-selected={selected}>
      {/* eslint-disable-next-line @next/next/no-img-element -- uploads are
          served raw by /api/uploads; next/image would add a second pipeline
          for no benefit and would not print any better. */}
      <img src={src} alt={alt ?? ""} style={{ width: `${width}%` }} />
      {caption && <figcaption>{caption}</figcaption>}

      {selected && editor.isEditable && (
        <div className="image-bar" contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
          {IMAGE_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              className={w === width ? "image-size is-active" : "image-size"}
              onClick={() => updateAttributes({ width: w })}
            >
              {w}%
            </button>
          ))}
          <input
            className="image-alt"
            placeholder="Alt text"
            value={alt ?? ""}
            onChange={(e) => updateAttributes({ alt: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <input
            className="image-alt"
            placeholder="Caption"
            value={caption ?? ""}
            // Empty means no caption at all, not an empty line under the image.
            onChange={(e) => updateAttributes({ caption: e.target.value || null })}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}
