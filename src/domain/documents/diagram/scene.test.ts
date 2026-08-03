import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "./diagram";
import { boxFrom, frame, uniformBoxSize } from "./layout/geometry";
import { placeNodes } from "./layout/place";
import { sampleDiagram } from "./sample";
import { toScene, type Shape, type TextShape } from "./scene";

const sceneOf = (kind: (typeof DIAGRAM_KINDS)[number]) => toScene(placeNodes(sampleDiagram(kind)));

const texts = (shapes: Shape[]): TextShape[] =>
  shapes.filter((s): s is TextShape => s.shape === "text");

describe("toScene", () => {
  it("keeps the canvas of the placement it was given", () => {
    const placement = placeNodes(sampleDiagram("flow"));
    const scene = toScene(placement);
    expect(scene.width).toBe(placement.width);
    expect(scene.height).toBe(placement.height);
  });

  it("writes every label the diagram declared", () => {
    const scene = sceneOf("flow");
    const drawn = texts(scene.shapes).map((t) => t.text);
    for (const node of sampleDiagram("flow").nodes) expect(drawn).toContain(node.label);
    expect(drawn).toContain("yes");
  });

  it("paints bands before the boxes that sit on them", () => {
    const scene = sceneOf("architecture");
    const band = scene.shapes.findIndex((s) => s.shape === "rect" && s.fill === "band");
    const box = scene.shapes.findIndex((s) => s.shape === "rect" && s.fill === "surface");
    expect(band).toBeGreaterThanOrEqual(0);
    expect(band).toBeLessThan(box);
  });

  it("names colours by role, never by value", () => {
    for (const kind of DIAGRAM_KINDS) {
      for (const shape of sceneOf(kind).shapes) {
        const inks = shape.shape === "text" ? [shape.fill] : [shape.fill, shape.stroke];
        for (const value of inks) {
          expect(value === null || !String(value).includes("#")).toBe(true);
        }
      }
    }
  });

  it("gives an arrow a filled head, so no SVG marker has to inherit a colour", () => {
    const scene = sceneOf("flow");
    const heads = scene.shapes.filter((s) => s.shape === "path" && s.fill === "line");
    expect(heads.length).toBe(sampleDiagram("flow").edges.length);
    for (const head of heads) {
      if (head.shape === "path") expect(head.d.endsWith("Z")).toBe(true);
    }
  });

  it("puts a plate under an edge label, so the line does not run through the text", () => {
    const scene = sceneOf("flow");
    const label = texts(scene.shapes).findIndex((t) => t.text === "yes");
    expect(label).toBeGreaterThanOrEqual(0);
    const plates = scene.shapes.filter((s) => s.shape === "rect" && s.fill === "surface" && s.stroke === null);
    expect(plates.length).toBeGreaterThan(0);
  });

  it("marks a node's accent on the box that carries it and leaves the others plain", () => {
    const scene = sceneOf("flow");
    const accents = scene.shapes.filter(
      (s) => s.shape === "rect" && String(s.fill).startsWith("accent-"),
    );
    expect(accents).toHaveLength(2);
  });

  it("writes a note under the label rather than beside it", () => {
    const scene = sceneOf("timeline");
    const label = texts(scene.shapes).find((t) => t.text === "Discovery") as TextShape;
    const note = texts(scene.shapes).find((t) => t.text === "Q1") as TextShape;
    expect(note.y).toBeGreaterThan(label.y);
    expect(note.x).toBe(label.x);
  });

  /**
   * The box drawn on export must be the box measured for: a note that wraps to
   * two lines on screen has to wrap to two `<text>` elements here too, or the
   * box the layout sized for two lines shows only one and stands too tall.
   */
  it("writes one line of text per line the note wraps to", () => {
    const long = {
      id: "svc",
      label: "DB",
      note: "mount: kv/ (v2) policies: eso-reader, dev-projects, ci-terraform auth: k8s+jwt",
    };
    const size = uniformBoxSize([long]);
    const placed = boxFrom(long, { x: 0, y: 0 }, size);
    const placement = frame({ boxes: [placed], groups: [], edges: [], rails: [] });
    const scene = toScene(placement);
    const noteTexts = texts(scene.shapes).filter((t) => placed.noteLines.includes(t.text));
    expect(noteTexts).toHaveLength(placed.noteLines.length);
    expect(placed.noteLines.length).toBeGreaterThan(1);
    for (let i = 1; i < noteTexts.length; i++) {
      expect(noteTexts[i].y).toBeGreaterThan(noteTexts[i - 1].y);
    }
  });
});
