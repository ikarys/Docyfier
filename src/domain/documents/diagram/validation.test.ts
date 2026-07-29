import { describe, expect, it } from "vitest";
import { MAX_EDGES, MAX_LABEL, MAX_NODES, MAX_NOTE, type DiagramAttrs } from "./diagram";
import { diagramError, isDiagramAttrs } from "./validation";

const valid: DiagramAttrs = {
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

/**
 * `diagramError` is what stands between a model's output and an undrawable
 * block in a saved document: every message it returns feeds the AI retry loop,
 * so each one names the offending node or edge rather than failing anonymously.
 */
describe("diagramError", () => {
  it("accepts well-formed attrs", () => {
    expect(diagramError(valid)).toBeNull();
  });

  it("rejects a non-object", () => {
    expect(diagramError(null)).toBe("diagram attrs missing");
    expect(diagramError("flow")).toBe("diagram attrs missing");
  });

  it("rejects a kind no layout can place", () => {
    expect(diagramError({ ...valid, kind: "venn" })).toMatch(/"kind" must be one of/);
  });

  it("rejects a direction the layouts do not know", () => {
    expect(diagramError({ ...valid, direction: "up" })).toMatch(/"direction" must be/);
  });

  it("rejects nodes that are missing, empty or beyond what fits a page", () => {
    expect(diagramError({ ...valid, nodes: "a,b" })).toMatch(/"nodes" must be an array/);
    expect(diagramError({ ...valid, nodes: [], edges: [] })).toMatch(/needs at least 1 node/);
    const many = Array.from({ length: MAX_NODES + 1 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    expect(diagramError({ ...valid, nodes: many, edges: [] })).toMatch(/at most 24 nodes, got 25/);
  });

  it("rejects a malformed node", () => {
    expect(diagramError({ ...valid, nodes: [null, valid.nodes[1]] })).toMatch(
      /node #1 is not an object/,
    );
    expect(diagramError({ ...valid, nodes: [{ label: "Demande" }, valid.nodes[1]] })).toMatch(
      /node #1 needs a non-empty string "id"/,
    );
    expect(diagramError({ ...valid, nodes: [{ id: " ", label: "x" }, valid.nodes[1]] })).toMatch(
      /node #1 needs a non-empty string "id"/,
    );
    expect(diagramError({ ...valid, nodes: [{ id: "a" }, valid.nodes[1]] })).toMatch(
      /node "a" needs a string "label"/,
    );
  });

  it("rejects two nodes sharing an id, because every edge would become ambiguous", () => {
    const nodes = [
      { id: "a", label: "Demande" },
      { id: "a", label: "Autre" },
    ];
    expect(diagramError({ ...valid, nodes, edges: [] })).toBe('diagram node id "a" is used twice');
  });

  it("rejects a label longer than a box can carry", () => {
    const label = "x".repeat(MAX_LABEL + 1);
    expect(diagramError({ ...valid, nodes: [{ id: "a", label }, valid.nodes[1]] })).toMatch(
      /label is longer than 80 characters/,
    );
  });

  it("accepts a note and an icon, and rejects a note past the second line", () => {
    const node = { id: "a", label: "Demande", note: "REST", icon: "server" };
    expect(diagramError({ ...valid, nodes: [node, valid.nodes[1]] })).toBeNull();

    const note = "x".repeat(MAX_NOTE + 1);
    expect(diagramError({ ...valid, nodes: [{ id: "a", label: "A", note }, valid.nodes[1]] })).toMatch(
      /note must be text of at most 160 characters/,
    );
    expect(diagramError({ ...valid, nodes: [{ id: "a", label: "A", icon: 3 }, valid.nodes[1]] })).toMatch(
      /icon must be a name/,
    );
  });

  it("rejects an edge pointing at a node that was never declared", () => {
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], to: "zzz" }] })).toBe(
      'diagram edge #1 points at "zzz", which is not a declared node',
    );
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], from: "zzz" }] })).toMatch(
      /points at "zzz"/,
    );
  });

  it("rejects an edge from a node to itself, which no layout can route", () => {
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], to: "a" }] })).toMatch(
      /edge #1 starts and ends on "a"/,
    );
  });

  it("rejects a malformed edge", () => {
    expect(diagramError({ ...valid, edges: [null] })).toMatch(/edge #1 is not an object/);
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], style: "wavy" }] })).toMatch(
      /edge #1 "style" must be/,
    );
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], head: "dot" }] })).toMatch(
      /edge #1 "head" must be/,
    );
    expect(diagramError({ ...valid, edges: [{ ...valid.edges[0], label: 7 }] })).toMatch(
      /edge #1 label" must be text or null/,
    );
  });

  it("rejects more edges than the drawing can stay legible with", () => {
    const nodes = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }));
    const edges = Array.from({ length: MAX_EDGES + 1 }, () => ({ ...edge, from: "n0", to: "n1" }));
    expect(diagramError({ ...valid, nodes, edges })).toMatch(/at most 40 edges, got 41/);
  });

  it("rejects a node placed in a group that was never declared", () => {
    const nodes = [{ id: "a", label: "Demande", group: "backend" }, valid.nodes[1]];
    expect(diagramError({ ...valid, nodes, edges: [] })).toBe(
      'diagram node "a" belongs to group "backend", which is not declared',
    );
  });

  it("accepts a node in a declared group", () => {
    const nodes = [{ id: "a", label: "Demande", group: "backend" }, valid.nodes[1]];
    const groups = [{ id: "backend", label: "Backend" }];
    expect(diagramError({ ...valid, nodes, groups })).toBeNull();
  });

  it("rejects a malformed group", () => {
    expect(diagramError({ ...valid, groups: "backend" })).toMatch(/"groups" must be an array/);
    expect(diagramError({ ...valid, groups: [null] })).toMatch(/group #1 is not an object/);
    expect(diagramError({ ...valid, groups: [{ label: "Backend" }] })).toMatch(
      /group #1 needs a non-empty string "id"/,
    );
    expect(diagramError({ ...valid, groups: [{ id: "g" }] })).toMatch(
      /group "g" needs a string "label"/,
    );
  });

  it("rejects two groups sharing an id", () => {
    const groups = [
      { id: "g", label: "Backend" },
      { id: "g", label: "Front" },
    ];
    expect(diagramError({ ...valid, groups })).toBe('diagram group id "g" is used twice');
  });

  it("accepts an accent within the palette and rejects one outside it", () => {
    const withAccent = (accent: unknown) => ({
      ...valid,
      nodes: [{ id: "a", label: "Demande", accent }, valid.nodes[1]],
    });
    expect(diagramError(withAccent(3))).toBeNull();
    expect(diagramError(withAccent(0))).toMatch(/accent must be a whole number between 1 and 4/);
    expect(diagramError(withAccent(5))).toMatch(/accent must be a whole number between 1 and 4/);
    expect(diagramError(withAccent(1.5))).toMatch(/accent must be a whole number between 1 and 4/);
  });

  it("rejects a title or caption that is neither text nor absent", () => {
    expect(diagramError({ ...valid, title: 12 })).toMatch(/"title" must be text or null/);
    expect(diagramError({ ...valid, caption: [] })).toMatch(/"caption" must be text or null/);
  });
});

describe("isDiagramAttrs", () => {
  it("mirrors diagramError as a type guard", () => {
    expect(isDiagramAttrs(valid)).toBe(true);
    expect(isDiagramAttrs({ ...valid, kind: "venn" })).toBe(false);
  });
});
