import type { ImageRasterizer, RasterImage } from "@/domain/publishing/image-rasterizer";

/**
 * SVG → PNG through `sharp`, which renders with librsvg.
 *
 * Chosen over a headless browser for the reason PLAN.md already gives for not
 * shipping one: a Chromium is a heavy dependency to carry for a figure, and
 * `sharp` is in the tree anyway. The trade is that librsvg resolves no CSS
 * variable, no `currentColor` and no web font — which is exactly why
 * `scene-to-svg.ts` writes every colour out and uses `<text>` alone.
 *
 * Imported dynamically, like `docx` and `mammoth` on either side of it, so the
 * native binding never reaches a browser bundle.
 */

/** CSS pixels per inch, the density at which an SVG's own units are 1:1. */
const BASE_DENSITY = 96;

export const sharpRasterizer: ImageRasterizer = {
  async toPng(svg: string, scale: number): Promise<RasterImage> {
    const sharp = (await import("sharp")).default;
    const bytes = await sharp(Buffer.from(svg), { density: BASE_DENSITY * scale })
      .png()
      .toBuffer();
    const { width, height } = await sharp(bytes).metadata();
    return { bytes: new Uint8Array(bytes), width: width ?? 0, height: height ?? 0 };
  },
};
