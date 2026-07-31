import { describe, expect, it } from "vitest";
import { DIAGRAM_KINDS, type DiagramAttrs } from "../diagram";
import { sampleDiagram } from "../sample";
import type { PlacedBox, Placement, Point } from "./geometry";
import { placeNodes } from "./place";

/**
 * The invariants every layout owes the renderer, whatever it draws.
 *
 * These are what let the AI emit a diagram nobody proof-reads: if boxes cannot
 * overlap and nothing can fall outside the canvas, a bad graph comes out plain
 * rather than broken.
 */

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

/**
 * Does the straight segment a-b pass through the inside of the box?
 *
 * An edge spanning more than one rank used to be drawn as one line from its
 * source to its target, straight over whatever sat between them: nine such
 * segments on a ten-node flow. An arrow through a box says two things are
 * connected that are not.
 */
function crosses(a: Point, b: Point, box: PlacedBox): boolean {
  const inside = (p: Point): boolean =>
    p.x > box.x + 1 && p.x < box.x + box.width - 1 && p.y > box.y + 1 && p.y < box.y + box.height - 1;
  const steps = 40;
  return Array.from({ length: steps - 1 }, (_, i) =>
    inside({ x: a.x + ((b.x - a.x) * (i + 1)) / steps, y: a.y + ((b.y - a.y) * (i + 1)) / steps }),
  ).some(Boolean);
}

function expectSound(placement: Placement, attrs: DiagramAttrs): void {
  expect(placement.boxes).toHaveLength(attrs.nodes.length);
  expect(placement.width).toBeGreaterThan(0);
  expect(placement.height).toBeGreaterThan(0);

  for (const box of placement.boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(placement.width);
    expect(box.y + box.height).toBeLessThanOrEqual(placement.height);
  }

  for (const [i, a] of placement.boxes.entries()) {
    for (const b of placement.boxes.slice(i + 1)) {
      expect(overlaps(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
    }
  }

  for (const edge of placement.edges) {
    for (const box of placement.boxes) {
      if (box.id === edge.from || box.id === edge.to) continue;
      const over = edge.points.some((point, i) => {
        const next = edge.points[i + 1];
        return next !== undefined && crosses(point, next, box);
      });
      expect(over, `${edge.from}->${edge.to} runs over ${box.id}`).toBe(false);
    }

    expect(edge.points.length).toBeGreaterThanOrEqual(2);
    for (const point of edge.points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(placement.width);
      expect(point.y).toBeLessThanOrEqual(placement.height);
    }
    for (let i = 0; i < edge.points.length - 1; i++) {
      const a = edge.points[i];
      const b = edge.points[i + 1];
      const straight = Math.abs(a.x - b.x) < 0.01 || Math.abs(a.y - b.y) < 0.01;
      expect(straight, `${edge.from}->${edge.to} segment ${i} is diagonal`).toBe(true);
    }
  }
}

describe("placeNodes", () => {
  it("draws every sample soundly, in both directions", () => {
    for (const kind of DIAGRAM_KINDS) {
      for (const direction of ["down", "right"] as const) {
        const attrs = { ...sampleDiagram(kind), direction };
        expectSound(placeNodes(attrs), attrs);
      }
    }
  });

  it("gives the same drawing every time, so an export can be diffed", () => {
    for (const kind of DIAGRAM_KINDS) {
      const attrs = sampleDiagram(kind);
      expect(placeNodes(attrs)).toEqual(placeNodes(attrs));
    }
  });

  it("places a single node without dividing by anything", () => {
    const attrs: DiagramAttrs = {
      kind: "flow",
      direction: "down",
      nodes: [{ id: "only", label: "Only" }],
      edges: [],
      groups: [],
      title: null,
      caption: null,
    };
    expectSound(placeNodes(attrs), attrs);
  });

  it("stays sound on the largest diagram the model may emit", () => {
    const nodes = Array.from({ length: 24 }, (_, i) => ({ id: `n${i}`, label: `Step ${i}` }));
    const edges = nodes.slice(1).map((n, i) => ({
      from: nodes[i].id,
      to: n.id,
      label: null,
      style: "solid" as const,
      head: "arrow" as const,
    }));
    const attrs: DiagramAttrs = {
      kind: "flow",
      direction: "down",
      nodes,
      edges,
      groups: [],
      title: null,
      caption: null,
    };
    expectSound(placeNodes(attrs), attrs);
  });

  /**
   * A flow where a step skips ahead — an escalation, an early exit, a retry
   * that rejoins later. Every sample happens to connect neighbouring ranks, so
   * nothing pinned what an edge does when it has ranks to get past.
   */
  it("gets a skipping edge past the ranks between, not through them", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, label: `Step ${i}` }));
    const chain = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));
    const skips = [
      { from: "n0", to: "n5" },
      { from: "n1", to: "n7" },
      { from: "n2", to: "n6" },
      { from: "n0", to: "n3" },
    ];
    const attrs: DiagramAttrs = {
      kind: "flow",
      direction: "down",
      nodes,
      edges: [...chain, ...skips].map((e) => ({
        ...e,
        label: null,
        style: "solid" as const,
        head: "arrow" as const,
      })),
      groups: [],
      title: null,
      caption: null,
    };
    expectSound(placeNodes(attrs), attrs);
    expectSound(placeNodes({ ...attrs, direction: "right" }), { ...attrs, direction: "right" });
  });

  it("keeps a wide fan-out from spilling out of the canvas", () => {
    const nodes = [
      { id: "root", label: "Root" },
      ...Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, label: `Child ${i}` })),
    ];
    const attrs: DiagramAttrs = {
      kind: "hierarchy",
      direction: "down",
      nodes,
      edges: nodes.slice(1).map((n) => ({
        from: "root",
        to: n.id,
        label: null,
        style: "solid" as const,
        head: "arrow" as const,
      })),
      groups: [],
      title: null,
      caption: null,
    };
    expectSound(placeNodes(attrs), attrs);
  });
});
