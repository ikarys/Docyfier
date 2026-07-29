import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS } from "./diagram";
import { sampleDiagram } from "./sample";
import { diagramError } from "./validation";

describe("sampleDiagram", () => {
  it("offers a valid placeholder for every kind, so inserting one never shows an error", () => {
    for (const kind of DIAGRAM_KINDS) {
      expect(diagramError(sampleDiagram(kind))).toBeNull();
    }
  });

  it("shows what each kind is for rather than a single empty box", () => {
    expect(sampleDiagram("flow").nodes.length).toBeGreaterThan(1);
    expect(sampleDiagram("timeline").edges).toEqual([]);
    expect(sampleDiagram("architecture").groups.length).toBeGreaterThan(0);
  });

  it("hands out a fresh copy, so editing one insertion never changes the next", () => {
    const first = sampleDiagram("flow");
    first.nodes[0].label = "Changed";
    expect(sampleDiagram("flow").nodes[0].label).toBe("Request");
  });
});
