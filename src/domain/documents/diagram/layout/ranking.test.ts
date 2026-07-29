import { describe, expect, it } from "vitest";
import type { DiagramEdge, DiagramNode } from "../diagram";
import { orderRanks, rankNodes, splitBackEdges } from "./ranking";

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
