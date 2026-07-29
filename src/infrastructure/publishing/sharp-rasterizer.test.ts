import { describe, expect, it } from "vitest";
import type { DocumentBody } from "@/domain/documents/body";
import { sampleDiagram, sampleDiagramNode } from "@/domain/documents/diagram/sample";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { toScene } from "@/domain/documents/diagram/scene";
import { sceneToSvg } from "@/infrastructure/rendering/svg/scene-to-svg";
import { EXPORT_SCALE, rasterizeDiagrams, toDataUri } from "./diagram-images";
import { sharpRasterizer } from "./sharp-rasterizer";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

const bodyWith = (...kinds: Parameters<typeof sampleDiagram>[0][]): DocumentBody => ({
  type: "doc",
  content: kinds.map(sampleDiagramNode),
});

/**
 * An adapter contract test: there is no way to prove an SVG rasteriser against
 * anything but a real one. It runs in memory and writes no file.
 */
describe("sharpRasterizer", () => {
  const svg = sceneToSvg(toScene(placeNodes(sampleDiagram("flow"))));

  it("produces a PNG", async () => {
    const image = await sharpRasterizer.toPng(svg, 1);
    expect([...image.bytes.slice(0, 4)]).toEqual(PNG_MAGIC);
  });

  it("renders at the scale it is asked for", async () => {
    const once = await sharpRasterizer.toPng(svg, 1);
    const twice = await sharpRasterizer.toPng(svg, 2);
    // Rasterising rounds to whole pixels, so doubling is within a pixel of exact.
    expect(twice.width).toBeCloseTo(once.width * 2, -0.5);
    expect(twice.height).toBeCloseTo(once.height * 2, -0.5);
  });

  it("reports the size of what it actually produced", async () => {
    const image = await sharpRasterizer.toPng(svg, 1);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });
});

describe("rasterizeDiagrams", () => {
  it("draws every diagram in the document, keyed by the node it came from", async () => {
    const body = bodyWith("flow", "hierarchy");
    const images = await rasterizeDiagrams(body, sharpRasterizer);
    expect(images.size).toBe(2);
    for (const node of body.content ?? []) expect(images.has(node)).toBe(true);
  });

  it("gives two diagrams that say the same thing an image each", async () => {
    const body = bodyWith("flow", "flow");
    const images = await rasterizeDiagrams(body, sharpRasterizer);
    expect(images.size).toBe(2);
  });

  it("skips a diagram whose attrs would not draw, rather than throwing", async () => {
    const body: DocumentBody = {
      type: "doc",
      content: [{ type: "diagram", attrs: { kind: "flow" } }],
    };
    expect((await rasterizeDiagrams(body, sharpRasterizer)).size).toBe(0);
  });

  it("draws at twice the size, so Word prints it sharp", async () => {
    const body = bodyWith("flow");
    const images = await rasterizeDiagrams(body, sharpRasterizer);
    const image = [...images.values()][0];
    const natural = await sharpRasterizer.toPng(
      sceneToSvg(toScene(placeNodes(sampleDiagram("flow")))),
      1,
    );
    expect(image.width).toBeCloseTo(natural.width * EXPORT_SCALE, -0.5);
  });
});

describe("toDataUri", () => {
  it("wraps the bytes in something an HTML paste can carry", async () => {
    const image = await sharpRasterizer.toPng(svgOf(), 1);
    expect(toDataUri(image).startsWith("data:image/png;base64,iVBOR")).toBe(true);
  });
});

function svgOf(): string {
  return sceneToSvg(toScene(placeNodes(sampleDiagram("timeline"))));
}
