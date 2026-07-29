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

/** A gallery row holds two to four images; fewer is a picture, more is a wall. */
export const IMAGE_ROW_MIN = 2;
export const IMAGE_ROW_MAX = 4;

/**
 * How a batch of images lands: the size of each gallery row, sharing them out
 * evenly so no row is left with a single widow beside a full one.
 */
export function imageRowSizes(count: number): number[] {
  if (count < IMAGE_ROW_MIN) return [];
  const rows = Math.ceil(count / IMAGE_ROW_MAX);
  const perRow = Math.floor(count / rows);
  const remainder = count % rows;
  return Array.from({ length: rows }, (_, index) => perRow + (index < remainder ? 1 : 0));
}

/** The widest a wrapped image may be before the text beside it is a gutter. */
const WRAPPED_MAX_WIDTH = 50;

/** Narrower than this and the image is an icon the writer cannot grab again. */
const MIN_WIDTH = 10;
const MAX_WIDTH = 100;

/** A width the document can store: whole percents of the text column. */
export function clampImageWidth(width: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)));
}

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
