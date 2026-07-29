import { describe, expect, it } from "vitest";
import type { DiagramAttrs, DiagramEdge } from "../diagram";
import { sampleDiagram } from "../sample";
import { placeNodes } from "./place";

const link = (from: string, to: string): DiagramEdge => ({
  from,
  to,
  label: null,
  style: "solid",
  head: "arrow",
});

const attrs = (over: Partial<DiagramAttrs>): DiagramAttrs => ({
  kind: "flow",
  direction: "down",
  nodes: [],
  edges: [],
  groups: [],
  title: null,
  caption: null,
  ...over,
});

const centreX = (box: { x: number; width: number }) => box.x + box.width / 2;

describe("layered", () => {
  it("runs the flow down the page, each step below the one before it", () => {
    const placement = placeNodes(
      attrs({
        nodes: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        edges: [link("a", "b")],
      }),
    );
    const [a, b] = placement.boxes;
    expect(b.y).toBeGreaterThan(a.y + a.height);
  });

  it("runs it across the page when the direction says so", () => {
    const placement = placeNodes(
      attrs({
        direction: "right",
        nodes: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        edges: [link("a", "b")],
      }),
    );
    const [a, b] = placement.boxes;
    expect(b.x).toBeGreaterThan(a.x + a.width);
    expect(Math.abs(b.y - a.y)).toBeLessThan(1);
  });

  it("routes a loop beside the drawing instead of back through it", () => {
    const placement = placeNodes(
      attrs({
        nodes: [
          { id: "run", label: "Run" },
          { id: "check", label: "Check" },
        ],
        edges: [link("run", "check"), link("check", "run")],
      }),
    );
    const rightmost = Math.max(...placement.boxes.map((b) => b.x + b.width));
    const loop = placement.edges.find((e) => e.from === "check") as (typeof placement.edges)[0];
    expect(Math.max(...loop.points.map((p) => p.x))).toBeGreaterThan(rightmost);
  });

  it("draws a band around a group, behind its members and no smaller", () => {
    const placement = placeNodes(sampleDiagram("architecture"));
    const back = placement.groups.find((g) => g.id === "back") as (typeof placement.groups)[0];
    const members = placement.boxes.filter((b) => b.id === "api" || b.id === "db");
    for (const member of members) {
      expect(member.x).toBeGreaterThan(back.x);
      expect(member.x + member.width).toBeLessThan(back.x + back.width);
      expect(member.y).toBeGreaterThan(back.y);
      expect(member.y + member.height).toBeLessThan(back.y + back.height);
    }
  });
});

describe("tree", () => {
  it("centres a parent over the children it owns", () => {
    const placement = placeNodes(
      attrs({
        kind: "hierarchy",
        nodes: [
          { id: "root", label: "Root" },
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
        edges: [link("root", "a"), link("root", "b")],
      }),
    );
    const box = (id: string) => placement.boxes.find((b) => b.id === id) as (typeof placement.boxes)[0];
    const middle = (centreX(box("a")) + centreX(box("b"))) / 2;
    expect(centreX(box("root"))).toBeCloseTo(middle, 1);
  });

  it("sends each generation one row further down", () => {
    const placement = placeNodes(
      attrs({
        kind: "hierarchy",
        nodes: [
          { id: "root", label: "Root" },
          { id: "child", label: "Child" },
          { id: "grand", label: "Grand" },
        ],
        edges: [link("root", "child"), link("child", "grand")],
      }),
    );
    const ys = ["root", "child", "grand"].map(
      (id) => (placement.boxes.find((b) => b.id === id) as (typeof placement.boxes)[0]).y,
    );
    expect(ys[0]).toBeLessThan(ys[1]);
    expect(ys[1]).toBeLessThan(ys[2]);
  });
});

describe("lanes", () => {
  it("hangs a lifeline under every participant", () => {
    const placement = placeNodes(sampleDiagram("sequence"));
    expect(placement.rails.filter((r) => r.kind === "lifeline")).toHaveLength(3);
  });

  it("stacks the messages in the order they were declared", () => {
    const placement = placeNodes(sampleDiagram("sequence"));
    const ys = placement.edges.map((e) => e.points[0].y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
  });

  it("keeps a message level, from one lifeline straight across to another", () => {
    const placement = placeNodes(sampleDiagram("sequence"));
    for (const edge of placement.edges) {
      expect(edge.points[0].y).toBe(edge.points[1].y);
    }
  });
});

describe("timeline", () => {
  it("draws an axis and one mark per phase, and no arrows at all", () => {
    const placement = placeNodes(sampleDiagram("timeline"));
    expect(placement.rails.filter((r) => r.kind === "axis")).toHaveLength(1);
    expect(placement.rails.filter((r) => r.kind === "tick")).toHaveLength(3);
    expect(placement.edges).toEqual([]);
  });

  it("strings the phases out in node order", () => {
    const placement = placeNodes(sampleDiagram("timeline"));
    const xs = placement.boxes.map((b) => b.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });
});
