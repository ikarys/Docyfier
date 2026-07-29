/**
 * Turning a drawing into pixels — the port a destination needs when it cannot
 * take vector art (PLAN.md STEP 10).
 *
 * Word embeds bitmaps, and the tools this app pastes into upload a bitmap far
 * more reliably than they accept inline SVG. Rasterising is therefore an
 * export-time concern, not something the editor or the domain ever does: a
 * diagram stays vector everywhere it can.
 */

export interface RasterImage {
  bytes: Uint8Array;
  /** Pixel size of the produced image, which `scale` has already multiplied. */
  width: number;
  height: number;
}

export interface ImageRasterizer {
  /**
   * Render `svg` to PNG at `scale`× its declared size.
   *
   * The SVG must be standalone — no CSS variable, no external font — because
   * an implementation is free to render it outside a browser.
   */
  toPng(svg: string, scale: number): Promise<RasterImage>;
}
