import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "@/domain/documents/diagram/diagram";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { toScene } from "@/domain/documents/diagram/scene";
import { DEFAULT_DIAGRAM_PALETTE, sceneToSvg } from "./scene-to-svg";

const svgOf = (kind: (typeof DIAGRAM_KINDS)[number]) =>
  sceneToSvg(toScene(placeNodes(sampleDiagram(kind))));

/**
 * These assertions are the librsvg contract, and they are tests rather than a
 * comment because breaking them fails silently: a diagram exported with a CSS
 * variable in it rasterises colourless, and nobody notices until a Word
 * document lands on someone's desk.
 */
describe("sceneToSvg", () => {
  it("carries nothing librsvg cannot resolve", () => {
    for (const kind of DIAGRAM_KINDS) {
      const svg = svgOf(kind);
      expect(svg).not.toContain("var(");
      expect(svg).not.toContain("currentColor");
      expect(svg).not.toContain("foreignObject");
      expect(svg).not.toContain("<style");
      expect(svg).not.toContain("class=");
    }
  });

  it("stands on its own, with a namespace and its own size", () => {
    const svg = svgOf("flow");
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+" height="\d+"/);
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("writes every colour out as a value", () => {
    const svg = svgOf("architecture");
    expect(svg).toContain(DEFAULT_DIAGRAM_PALETTE.surface);
    expect(svg).toContain(DEFAULT_DIAGRAM_PALETTE.line);
    expect(svg).toContain(DEFAULT_DIAGRAM_PALETTE["accent-2"]);
  });

  it("takes the palette it is handed, so a themed document exports in its own colours", () => {
    const svg = sceneToSvg(toScene(placeNodes(sampleDiagram("flow"))), {
      ...DEFAULT_DIAGRAM_PALETTE,
      "accent-2": "#ff0066",
    });
    expect(svg).toContain("#ff0066");
  });

  it("escapes a label rather than letting it close the document", () => {
    const attrs = sampleDiagram("flow");
    attrs.nodes[0].label = '<script>"&';
    const svg = sceneToSvg(toScene(placeNodes(attrs)));
    expect(svg).toContain("&lt;script&gt;&quot;&amp;");
    expect(svg).not.toContain("<script>");
  });

  it("draws every text of the scene and nothing else as text", () => {
    const scene = toScene(placeNodes(sampleDiagram("sequence")));
    const svg = sceneToSvg(scene);
    const drawn = svg.match(/<text /g) ?? [];
    expect(drawn).toHaveLength(scene.shapes.filter((s) => s.shape === "text").length);
  });
});
