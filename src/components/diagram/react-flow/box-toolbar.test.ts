import { describe, expect, it } from "vitest";
import { ACCENT_SLOTS, type DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { setAccent } from "@/domain/documents/diagram/diagram-edits";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { ACCENT_CHOICES, removesBox, toolbarFor } from "./box-toolbar";

/**
 * What the bar over a selected box offers.
 *
 * The rule worth stating away from the DOM is the last one: a button that
 * cannot change anything is worse than no button, and whether a box may go is
 * something only the diagram knows — a flow of one, a sequence of two.
 */

const flow = () => sampleDiagram("flow");

describe("the bar over a selected box", () => {
  it("offers plain and every colour a box may wear", () => {
    expect(ACCENT_CHOICES).toHaveLength(ACCENT_SLOTS + 1);
    expect(ACCENT_CHOICES[0]).toBeNull();
    expect(ACCENT_CHOICES.slice(1)).toEqual([1, 2, 3, 4]);
  });

  it("says which colour the box is wearing", () => {
    const attrs = setAccent(flow(), "review", 3);
    expect(toolbarFor(attrs, "box:review")?.accent).toBe(3);
    expect(toolbarFor(flow(), "box:review")?.accent).toBeNull();
  });

  it("names the node behind the surface's own id", () => {
    expect(toolbarFor(flow(), "box:review")?.id).toBe("review");
  });

  it("has nothing to offer over a band or over nothing", () => {
    const attrs = sampleDiagram("architecture");
    expect(attrs.groups.length).toBeGreaterThan(0);
    expect(toolbarFor(attrs, `band:${attrs.groups[0].id}`)).toBeNull();
    expect(toolbarFor(attrs, "box:absent")).toBeNull();
  });

  it("offers to delete a box the diagram can do without", () => {
    expect(toolbarFor(flow(), "box:review")?.removable).toBe(true);
  });

  it("does not offer to delete the only box there is", () => {
    const attrs: DiagramAttrs = { ...flow(), nodes: [{ id: "only", label: "Only" }], edges: [] };
    expect(toolbarFor(attrs, "box:only")?.removable).toBe(false);
  });

  /** A sequence needs two participants, so the second-to-last one cannot go. */
  it("does not offer a deletion the kind would refuse", () => {
    const attrs = sampleDiagram("sequence");
    const pair: DiagramAttrs = {
      ...attrs,
      nodes: attrs.nodes.slice(0, 2),
      edges: attrs.edges.filter(
        (e) => e.from === attrs.nodes[0].id && e.to === attrs.nodes[1].id,
      ),
    };
    expect(pair.edges.length).toBeGreaterThan(0);
    expect(toolbarFor(pair, `box:${pair.nodes[0].id}`)?.removable).toBe(false);
  });
});

describe("a key pressed on the drawing", () => {
  it("removes the selected box on Delete and on Backspace", () => {
    expect(removesBox("Delete")).toBe(true);
    expect(removesBox("Backspace")).toBe(true);
  });

  it("leaves the drawing alone on anything else", () => {
    for (const key of ["a", "Enter", "Escape", "ArrowLeft", " "]) {
      expect(removesBox(key)).toBe(false);
    }
  });
});
