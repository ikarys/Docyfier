import { describe, expect, it } from "vitest";
import type { DiagramEdge, DiagramNode } from "../diagram";
import { MAX_PER_ROW, orderRanks, rankNodes, splitBackEdges, wrapWideRanks } from "./ranking";

const node = (id: string, group?: string): DiagramNode => ({ id, label: id, group });
const link = (from: string, to: string): DiagramEdge => ({
  from,
  to,
  label: null,
  style: "solid",
  head: "arrow",
});

describe("splitBackEdges", () => {
  it("takes out the edge that closes a loop and keeps the rest", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [link("a", "b"), link("b", "c"), link("c", "a")];
    const { forward, back } = splitBackEdges(nodes, edges);
    expect(back).toEqual([link("c", "a")]);
    expect(forward).toHaveLength(2);
  });

  it("leaves an acyclic graph whole", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [link("a", "b"), link("a", "c"), link("b", "c")];
    expect(splitBackEdges(nodes, edges).back).toEqual([]);
  });
});

describe("rankNodes", () => {
  it("puts a node one rank past the furthest thing that leads to it", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges = [link("a", "b"), link("b", "c"), link("a", "c")];
    // "c" could sit at rank 1 via a→c, but b→c pushes it past b.
    expect(rankNodes(nodes, edges)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("starts an unconnected node at the first rank rather than dropping it", () => {
    const nodes = [node("a"), node("b"), node("loner")];
    expect(rankNodes(nodes, [link("a", "b")])).toEqual([["a", "loner"], ["b"]]);
  });
});

describe("orderRanks", () => {
  it("keeps a group's members side by side, so a band can be drawn around them", () => {
    const nodes = [
      node("a", "front"),
      node("b", "back"),
      node("c", "front"),
      node("d", "back"),
    ];
    const ranks = [["a", "b", "c", "d"]];
    expect(orderRanks(ranks, nodes, [])).toEqual([["a", "c", "b", "d"]]);
  });

  it("pulls a node towards what leads into it", () => {
    const nodes = ["p1", "p2", "x", "y"].map((id) => node(id));
    const ranks = [
      ["p1", "p2"],
      ["x", "y"],
    ];
    // "y" hangs off the first parent and "x" off the second, so they swap.
    const edges = [link("p2", "x"), link("p1", "y")];
    expect(orderRanks(ranks, nodes, edges)).toEqual([
      ["p1", "p2"],
      ["y", "x"],
    ]);
  });
});

/**
 * An architecture drawing states what contains what and often draws no arrow at
 * all. Ranking has nothing to say about it, so every box lands on rank 0 — and
 * nine boxes on one rank is a strip a thousand pixels wide and unreadable in a
 * text column, which is what "turn this into a diagram" produced.
 */
describe("wrapWideRanks", () => {
  it("leaves a rank that fits alone", () => {
    const ranks = [["a", "b", "c"]];
    expect(wrapWideRanks(ranks, [])).toEqual(ranks);
  });

  it("breaks a rank nobody ordered into rows of even length", () => {
    const nine = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(wrapWideRanks([nine], [])).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
      ["g", "h", "i"],
    ]);
  });

  it("never leaves a row longer than the ceiling", () => {
    const many = Array.from({ length: 17 }, (_, i) => `n${i}`);
    for (const row of wrapWideRanks([many], [])) {
      expect(row.length).toBeLessThanOrEqual(MAX_PER_ROW);
    }
  });

  /** Wrapping keeps reading order, so a group ordered side by side stays so. */
  it("keeps the order it was given", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(wrapWideRanks([ids], []).flat()).toEqual(ids);
  });

  /**
   * A band is drawn around the box its members occupy. A row holding one member
   * of each of three nested groups makes all three bands cover each other, and
   * the drawing then says the system is something it is not.
   */
  it("never puts two groups in one row", () => {
    const nodes = [
      node("a", "outer"),
      node("b", "outer"),
      node("c", "inner"),
      node("d", "inner"),
      node("e", "inner"),
    ];
    expect(wrapWideRanks([["a", "b", "c", "d", "e"]], [], nodes)).toEqual([
      ["a", "b"],
      ["c", "d", "e"],
    ]);
  });

  it("still wraps a run of one group that is too long on its own", () => {
    const nodes = Array.from({ length: 6 }, (_, i) => node(`n${i}`, "one"));
    const rows = wrapWideRanks([nodes.map((n) => n.id)], [], nodes);
    expect(rows).toEqual([
      ["n0", "n1", "n2"],
      ["n3", "n4", "n5"],
    ]);
  });

  /**
   * The rule only applies where ranking said nothing. A rank an edge touches
   * was placed for a reason, and moving one of its boxes down a row would put
   * a source below the thing it points at.
   */
  it("leaves a wide rank alone when an edge touches it", () => {
    const wide = ["a", "b", "c", "d", "e", "f"];
    expect(wrapWideRanks([wide, ["z"]], [link("a", "z")])).toEqual([wide, ["z"]]);
  });
});
