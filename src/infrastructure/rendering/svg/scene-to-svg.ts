import type { Ink, Scene, Shape } from "@/domain/documents/diagram/scene";
import { escapeHtml } from "../html/escape";

/**
 * A scene as a standalone SVG string.
 *
 * Standalone is the whole point: this SVG is what Word, Confluence and Notion
 * receive, and what `sharp` rasterises. Its renderer is librsvg, which resolves
 * no CSS custom property, no `currentColor` and no web font — so every colour
 * is written out and the only text primitive used is `<text>`. The browser half
 * of the pair lives next to the editor and paints the same scene with tokens.
 */

export type DiagramPalette = Record<Ink, string>;

/**
 * Fallback colours for a diagram exported without a theme.
 *
 * They are the values behind the same tokens the charts use, so a document that
 * carries no theme still comes out looking like the product.
 */
export const DEFAULT_DIAGRAM_PALETTE: DiagramPalette = {
  surface: "#ffffff",
  border: "#cdd2dc",
  line: "#6b7180",
  text: "#1a1c22",
  muted: "#6b7180",
  band: "#f6f7fa",
  "band-border": "#cdd2dc",
  "accent-1": "#3b5bdb",
  "accent-2": "#1f9d6b",
  "accent-3": "#7048e8",
  "accent-4": "#b4690e",
};

const FONT_STACK = "Helvetica, Arial, sans-serif";

export function sceneToSvg(scene: Scene, palette: DiagramPalette = DEFAULT_DIAGRAM_PALETTE): string {
  const body = scene.shapes.map((shape) => draw(shape, palette)).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" ` +
    `viewBox="0 0 ${scene.width} ${scene.height}" font-family="${FONT_STACK}" role="img">` +
    `${body}</svg>`
  );
}

function draw(shape: Shape, palette: DiagramPalette): string {
  if (shape.shape === "rect") {
    return (
      `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ` +
      `rx="${shape.radius}"${paint(shape.fill, shape.stroke, 1, shape.dashed, palette)}/>`
    );
  }
  if (shape.shape === "path") {
    return `<path d="${shape.d}"${paint(shape.fill, shape.stroke, shape.width, shape.dashed, palette)}/>`;
  }
  return (
    `<text x="${shape.x}" y="${shape.y}" font-size="${shape.size}" ` +
    `${shape.bold ? 'font-weight="600" ' : ""}text-anchor="${shape.anchor}" ` +
    `fill="${palette[shape.fill]}">${escapeHtml(shape.text)}</text>`
  );
}

function paint(
  fill: Ink | null,
  stroke: Ink | null,
  width: number,
  dashed: boolean,
  palette: DiagramPalette,
): string {
  const parts = [` fill="${fill ? palette[fill] : "none"}"`];
  if (stroke) {
    parts.push(` stroke="${palette[stroke]}" stroke-width="${width}"`);
    if (dashed) parts.push(' stroke-dasharray="5 4"');
  }
  return parts.join("");
}
