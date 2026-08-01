import { describe, expect, it } from "vitest";
import { moveNode, realign } from "../diagram-edits";
import { sampleDiagram } from "../sample";
import type { PlacedBox, PlacedGroup, Point, Placement } from "./geometry";
import { placeNodes } from "./place";

/**
 * What a box someone dragged owes the rest of the drawing.
 *
 * A hand beats the layout for the box it touched and for nothing else: the
 * boxes nobody moved stay where they were computed, the band and the arrows
 * follow, and realigning gives the whole drawing back to the layout.
 */

function boxOf(placement: Placement, id: string): PlacedBox {
  return placement.boxes.find((box) => box.id === id) as PlacedBox;
}

function bandOf(placement: Placement, id: string): PlacedGroup {
  return placement.groups.find((group) => group.id === id) as PlacedGroup;
}

/** Where the arrow into `id` lands, which is the point that must follow the box. */
function tipOf(placement: Placement, id: string): Point {
  const points = (placement.edges.find((edge) => edge.to === id) as { points: Point[] }).points;
  return points[points.length - 1];
}

describe("a box someone moved", () => {
  it("is drawn where it was dropped", () => {
    const placement = placeNodes(moveNode(sampleDiagram("flow"), "rejected", 400, 320));
    expect(boxOf(placement, "rejected")).toMatchObject({ x: 400, y: 320 });
  });

  it("leaves every other box where the layout put it", () => {
    const before = placeNodes(sampleDiagram("flow"));
    const after = placeNodes(moveNode(sampleDiagram("flow"), "rejected", 400, 320));
    for (const id of ["request", "review", "approved"]) {
      expect(boxOf(after, id)).toEqual(boxOf(before, id));
    }
  });

  it("takes the band of its group with it", () => {
    const before = placeNodes(sampleDiagram("architecture"));
    const after = placeNodes(moveNode(sampleDiagram("architecture"), "db", 600, 40));
    const band = bandOf(after, "back");
    const box = boxOf(after, "db");
    expect(band.x + band.width).toBeGreaterThan(bandOf(before, "back").x + bandOf(before, "back").width);
    expect(band.x).toBeLessThanOrEqual(box.x);
    expect(band.x + band.width).toBeGreaterThanOrEqual(box.x + box.width);
    expect(band.y).toBeLessThanOrEqual(box.y);
    expect(band.y + band.height).toBeGreaterThanOrEqual(box.y + box.height);
  });

  it("drags the arrows that touch it", () => {
    const before = placeNodes(sampleDiagram("flow"));
    const after = placeNodes(moveNode(sampleDiagram("flow"), "rejected", 400, 320));
    const box = boxOf(after, "rejected");
    const tip = tipOf(after, "rejected");
    expect(tip).not.toEqual(tipOf(before, "rejected"));
    expect(tip.y).toBe(box.y);
    expect(tip.x).toBeGreaterThanOrEqual(box.x);
    expect(tip.x).toBeLessThanOrEqual(box.x + box.width);
  });

  it("makes the canvas grow rather than fall off it", () => {
    const before = placeNodes(sampleDiagram("flow"));
    const after = placeNodes(moveNode(sampleDiagram("flow"), "rejected", 900, 700));
    const box = boxOf(after, "rejected");
    expect(after.width).toBeGreaterThan(before.width);
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.width).toBeGreaterThanOrEqual(box.x + box.width);
    expect(after.height).toBeGreaterThanOrEqual(box.y + box.height);
  });

  it("is given back to the layout by realigning", () => {
    const plain = sampleDiagram("flow");
    const moved = moveNode(plain, "rejected", 400, 320);
    expect(placeNodes(realign(moved))).toEqual(placeNodes(plain));
  });

  /**
   * A lifeline hangs under its participant and a tick sits under its milestone.
   * A box dragged out of that column would leave its own line behind, so the
   * kinds that draw rails keep the place their layout computed.
   */
  it("is ignored where the drawing hangs a rail off it", () => {
    for (const kind of ["sequence", "timeline"] as const) {
      const plain = sampleDiagram(kind);
      const moved = moveNode(plain, plain.nodes[0].id, 500, 500);
      expect(boxOf(placeNodes(moved), plain.nodes[0].id)).not.toMatchObject({ x: 500, y: 500 });
      expect(placeNodes(moved)).toEqual(placeNodes(plain));
    }
  });
});
