import { describe, expect, it } from "vitest";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { setEdgeStyle } from "@/domain/documents/diagram/diagram-edits";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { toolbarFor } from "./edge-toolbar";

/**
 * What the bar over a selected arrow offers.
 *
 * Mirrors `box-toolbar.ts`: the rule worth stating away from the DOM is
 * `removable` — a sequence's last message cannot go, and a button that
 * quietly does nothing is worse than no button.
 */

const flow = () => sampleDiagram("flow");

describe("the bar over a selected arrow", () => {
  it("says which style the arrow wears", () => {
    expect(toolbarFor(flow(), "wire:0")?.dashed).toBe(false);
    const dashed = setEdgeStyle(flow(), 0, "dashed");
    expect(toolbarFor(dashed, "wire:0")?.dashed).toBe(true);
  });

  it("names the position behind the surface's own id", () => {
    expect(toolbarFor(flow(), "wire:1")?.index).toBe(1);
  });

  it("has nothing to offer over a box or over nothing", () => {
    expect(toolbarFor(flow(), "box:review")).toBeNull();
    expect(toolbarFor(flow(), "wire:99")).toBeNull();
  });

  it("offers to delete an arrow the diagram can do without", () => {
    expect(toolbarFor(flow(), "wire:0")?.removable).toBe(true);
  });

  it("does not offer a deletion the kind would refuse", () => {
    const attrs = sampleDiagram("sequence");
    const pair: DiagramAttrs = {
      ...attrs,
      nodes: attrs.nodes.slice(0, 2),
      edges: attrs.edges.filter(
        (e) => e.from === attrs.nodes[0].id && e.to === attrs.nodes[1].id,
      ),
    };
    expect(pair.edges.length).toBe(1);
    expect(toolbarFor(pair, "wire:0")?.removable).toBe(false);
  });
});
