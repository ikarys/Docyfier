import { describe, expect, it } from "vitest";
import { moveNode } from "@/domain/documents/diagram/diagram-edits";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { boxIdOf, toFlow, type BoxData, type FlowNode } from "./placement-to-flow";

/**
 * The drawing handed to the library that lets someone edit it.
 *
 * Nothing is decided here: every position, size and route comes from the
 * placement the domain computed, so the picture under the cursor is the picture
 * that gets exported. What this owes is identity — a box the library reports as
 * dragged has to name a node the diagram declares.
 */

const flow = () => placeNodes(sampleDiagram("flow"));
const boxes = (nodes: FlowNode[]) => nodes.filter((node) => node.type === "box");
const bands = (nodes: FlowNode[]) => nodes.filter((node) => node.type === "band");

describe("a placement handed to the editing surface", () => {
  it("gives one draggable node per box, where the layout put it", () => {
    const placement = flow();
    const { nodes } = toFlow(placement, "down");
    expect(boxes(nodes)).toHaveLength(placement.boxes.length);
    for (const box of placement.boxes) {
      const node = nodes.find((n) => boxIdOf(n.id) === box.id) as FlowNode;
      expect(node.position).toEqual({ x: box.x, y: box.y });
      expect(node.width).toBe(box.width);
      expect(node.height).toBe(box.height);
      expect(node.draggable).toBe(true);
    }
  });

  it("names its nodes so a group and a box may share an id", () => {
    const attrs = sampleDiagram("architecture");
    attrs.groups = [{ id: "web", label: "Front" }];
    attrs.nodes = attrs.nodes.map((node) => ({ ...node, group: "web" }));
    const { nodes } = toFlow(placeNodes(attrs), "down");
    expect(new Set(nodes.map((n) => n.id)).size).toBe(nodes.length);
    expect(boxIdOf("box:web")).toBe("web");
    expect(boxIdOf("band:web")).toBeNull();
  });

  it("lays the bands behind the boxes, out of reach", () => {
    const { nodes } = toFlow(placeNodes(sampleDiagram("architecture")), "down");
    expect(bands(nodes)).not.toHaveLength(0);
    for (const band of bands(nodes)) {
      expect(band.draggable).toBe(false);
      expect(band.selectable).toBe(false);
      expect(band.zIndex).toBeLessThan(boxes(nodes)[0].zIndex);
    }
  });

  it("carries the route the layout drew, not one of the library's own", () => {
    const placement = flow();
    const { edges } = toFlow(placement, "down");
    expect(edges).toHaveLength(placement.edges.length);
    expect(edges[0].data.points).toEqual(placement.edges[0].points);
    expect(edges[0].source).toBe("box:request");
    expect(edges[0].target).toBe("box:review");
  });

  it("tells two arrows between the same pair apart", () => {
    const attrs = sampleDiagram("flow");
    attrs.edges = [...attrs.edges, { ...attrs.edges[0], label: "again", style: "dashed" }];
    const { edges } = toFlow(placeNodes(attrs), "down");
    expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length);
  });

  /**
   * The box height carries a second line only when some box has a note, so a
   * diagram where nobody wrote one has nowhere to put it.
   */
  it("says whether a box has room for a note", () => {
    const withNotes = toFlow(placeNodes(sampleDiagram("architecture")), "down");
    const without = toFlow(flow(), "down");
    expect(boxes(withNotes.nodes).every((n) => (n.data as BoxData).roomForNote)).toBe(true);
    expect(boxes(without.nodes).some((n) => (n.data as BoxData).roomForNote)).toBe(false);
  });

  it("hands back the place a moved box was left in", () => {
    const attrs = moveNode(sampleDiagram("flow"), "rejected", 400, 320);
    const { nodes } = toFlow(placeNodes(attrs), "down");
    const node = nodes.find((n) => n.id === "box:rejected") as FlowNode;
    expect(node.position).toEqual({ x: 400, y: 320 });
  });
});
