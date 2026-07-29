/**
 * How an image sits on the page: the widths a writer picks from the image bar,
 * and the four places text can take around it.
 *
 * Presentation, but the document's own — the node that stores it, the editor
 * that draws it and the print stylesheet all read the vocabulary from here, so
 * a value none of them knows falls back instead of laying the page out at
 * random.
 */

export const IMAGE_WIDTHS = [25, 50, 75, 100] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

export const IMAGE_ALIGNMENTS = ["left", "center", "right", "full"] as const;
export type ImageAlignment = (typeof IMAGE_ALIGNMENTS)[number];

export const DEFAULT_IMAGE_ALIGNMENT: ImageAlignment = "center";

/** The widest a wrapped image may be before the text beside it is a gutter. */
const WRAPPED_MAX_WIDTH = 50;

export function imageAlignment(value: unknown): ImageAlignment {
  return IMAGE_ALIGNMENTS.includes(value as ImageAlignment)
    ? (value as ImageAlignment)
    : DEFAULT_IMAGE_ALIGNMENT;
}

/**
 * An image sent to the side has to leave room for the text that flows around
 * it: a full-width float wraps nothing, which is not what the writer asked for.
 */
export function widthForAlignment(width: number, alignment: ImageAlignment): number {
  const wraps = alignment === "left" || alignment === "right";
  return wraps ? Math.min(width, WRAPPED_MAX_WIDTH) : width;
}
