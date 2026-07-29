import {
  clampImageWidth,
  widthForAlignment,
  type ImageAlignment,
} from "@/domain/documents/image";

/**
 * The arithmetic of dragging an image's edge, kept away from the pointer
 * events that feed it so a test can state what a drag means without a DOM.
 *
 * A width is a percentage of the text column, never pixels: the theme and the
 * paper decide how wide that column really is.
 */
export interface ImageDrag {
  /** Pointer x where the drag started. */
  originX: number;
  /** Width, in percent, the image had then. */
  originWidth: number;
  /** Width of the text column, in pixels — what the percent is a percent of. */
  columnWidth: number;
  alignment: ImageAlignment;
}

/**
 * A centred image grows on both sides at once, so its edge travels only half
 * the width it gains. A wrapped one grows on one side only.
 */
const GROWTH_PER_TRAVEL: Record<ImageAlignment, number> = {
  left: 1,
  center: 2,
  right: 1,
  full: 1,
};

/** The width a drag has reached, in whole percents of the text column. */
export function widthFromDrag(drag: ImageDrag, x: number): number {
  const travelled = ((x - drag.originX) / Math.max(1, drag.columnWidth)) * 100;
  const grown = drag.originWidth + travelled * GROWTH_PER_TRAVEL[drag.alignment];
  return widthForAlignment(clampImageWidth(grown), drag.alignment);
}
