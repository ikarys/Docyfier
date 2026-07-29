import { describe, expect, it } from "vitest";
import type { DiagramAttrs } from "./diagram";
import { diagramError } from "./validation";

/**
 * The kinds do not merely change the drawing — each one asserts something about
 * the graph, and a graph that does not hold it would come out unreadable.
 */

const base: DiagramAttrs = {
  kind: "flow",
  direction: "down",
  nodes: [
    { id: "a", label: "Demande" },
    { id: "b", label: "Validation" },
  ],
  edges: [{ from: "a", to: "b", label: null, style: "solid", head: "arrow" }],
  groups: [],
  title: null,
  caption: null,
};

const edge = { label: null, style: "solid" as const, head: "arrow" as const };

describe("flow", () => {
  it("may loop back on itself, because a retry is a real step", () => {
    const nodes = [
      { id: "a", label: "Run" },
      { id: "b", label: "Check" },
    ];
    const edges = [
      { ...edge, from: "a", to: "b" },
      { ...edge, from: "b", to: "a" },
    ];
    expect(diagramError({ ...base, kind: "flow", nodes, edges })).toBeNull();
  });
});

describe("hierarchy", () => {
  it("rejects a cycle, which leaves no root to draw from", () => {
    const nodes = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const edges = [
      { ...edge, from: "a", to: "b" },
      { ...edge, from: "b", to: "a" },
    ];
    expect(diagramError({ ...base, kind: "hierarchy", nodes, edges })).toMatch(
      /hierarchy must not contain a cycle/,
    );
  });

  it("rejects a node that answers to two parents", () => {
    const nodes = [
      { id: "root", label: "Root" },
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    const edges = [
      { ...edge, from: "root", to: "b" },
      { ...edge, from: "a", to: "b" },
      { ...edge, from: "root", to: "a" },
    ];
    expect(diagramError({ ...base, kind: "hierarchy", nodes, edges })).toBe(
      'diagram hierarchy node "b" has more than one parent',
    );
  });

  it("rejects what is really two trees", () => {
    const nodes = [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ];
    expect(diagramError({ ...base, kind: "hierarchy", nodes, edges: [] })).toMatch(
      /hierarchy needs exactly one root, found 2/,
    );
  });

  it("accepts a single root with children", () => {
    const nodes = [
      { id: "root", label: "Root" },
      { id: "a", label: "A" },
    ];
    const edges = [{ ...edge, from: "root", to: "a" }];
    expect(diagramError({ ...base, kind: "hierarchy", nodes, edges })).toBeNull();
  });
});

describe("sequence", () => {
  it("needs two participants and a message before it is one", () => {
    const nodes = [{ id: "a", label: "Client" }];
    expect(diagramError({ ...base, kind: "sequence", nodes, edges: [] })).toMatch(
      /sequence needs at least 2 participants/,
    );
    expect(diagramError({ ...base, kind: "sequence", edges: [] })).toMatch(
      /sequence needs at least 1 message/,
    );
  });
});

describe("timeline", () => {
  it("refuses edges, because its order is the order of its nodes", () => {
    expect(diagramError({ ...base, kind: "timeline" })).toMatch(
      /timeline takes no edges: its order is the order of its nodes/,
    );
    expect(diagramError({ ...base, kind: "timeline", edges: [] })).toBeNull();
  });
});
