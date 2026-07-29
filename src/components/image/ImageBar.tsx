"use client";

import {
  IMAGE_ALIGNMENTS,
  IMAGE_WIDTHS,
  widthForAlignment,
  type ImageAlignment,
} from "@/domain/documents/image";

export interface ImagePlacement {
  alt: string | null;
  width: number;
  align: ImageAlignment;
  caption: string | null;
}

/** The bar under a selected image: how wide it is, where it sits, what it says. */
export function ImageBar({
  placement,
  onChange,
}: {
  placement: ImagePlacement;
  onChange: (patch: Partial<ImagePlacement>) => void;
}) {
  const { alt, width, align, caption } = placement;

  return (
    <div className="image-bar" contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
      {IMAGE_WIDTHS.map((value) => (
        <button
          key={value}
          type="button"
          className={value === width ? "image-size is-active" : "image-size"}
          onClick={() => onChange({ width: widthForAlignment(value, align) })}
        >
          {value}%
        </button>
      ))}
      <span className="image-bar-split" />
      {IMAGE_ALIGNMENTS.map((value) => (
        <button
          key={value}
          type="button"
          title={ALIGN_LABEL[value]}
          className={value === align ? "image-size is-active" : "image-size"}
          // Sending an image to the side narrows it: a full-width float leaves
          // the text nowhere to flow.
          onClick={() => onChange({ align: value, width: widthForAlignment(width, value) })}
        >
          {ALIGN_GLYPH[value]}
        </button>
      ))}
      <input
        className="image-alt"
        placeholder="Alt text"
        value={alt ?? ""}
        onChange={(e) => onChange({ alt: e.target.value })}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <input
        className="image-alt"
        placeholder="Caption"
        value={caption ?? ""}
        // Empty means no caption at all, not an empty line under the image.
        onChange={(e) => onChange({ caption: e.target.value || null })}
        onKeyDown={(e) => e.stopPropagation()}
      />
    </div>
  );
}

const ALIGN_LABEL: Record<ImageAlignment, string> = {
  left: "Wrap left",
  center: "Centered",
  right: "Wrap right",
  full: "Full width",
};

const ALIGN_GLYPH: Record<ImageAlignment, string> = {
  left: "⇤",
  center: "⇹",
  right: "⇥",
  full: "⇔",
};
