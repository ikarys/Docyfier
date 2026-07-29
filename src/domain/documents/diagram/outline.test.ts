import { describe, expect, it } from "vitest";
import type { DiagramAttrs } from "./diagram";
import { outlineOf } from "./outline";
import { sampleDiagram } from "./sample";

const texts = (attrs: DiagramAttrs) => outlineOf(attrs).map((line) => line.text);

describe("outlineOf", () => {
  it("states every relation a flow declares, with the arrow's own words", () => {
    expect(texts(sampleDiagram("flow"))).toEqual([
      "Request → Review",
      "Review → Approved (yes)",
      "Review → Rejected (no)",
    ]);
  });

  it("nests a hierarchy, because a tree's shape is what it says", () => {
    expect(outlineOf(sampleDiagram("hierarchy"))).toEqual([
      { text: "Product", depth: 0 },
      { text: "Design", depth: 1 },
      { text: "Build", depth: 1 },
    ]);
  });

  it("reads a timeline as its phases, notes and all", () => {
    expect(texts(sampleDiagram("timeline"))).toEqual([
      "Discovery — Q1",
      "Build — Q2",
      "Launch — Q3",
    ]);
  });

  it("leaves depth alone for the kinds that have no nesting", () => {
    for (const kind of ["flow", "architecture", "sequence", "timeline"] as const) {
      expect(outlineOf(sampleDiagram(kind)).every((line) => line.depth === 0)).toBe(true);
    }
  });

  it("keeps a box no arrow touches, which would otherwise vanish", () => {
    const attrs: DiagramAttrs = {
      ...sampleDiagram("flow"),
      nodes: [...sampleDiagram("flow").nodes, { id: "aside", label: "Audit log" }],
    };
    expect(texts(attrs)).toContain("Audit log");
  });
});
