import { describe, expect, it } from "vitest";
import type { DiagramEdge } from "../diagram";
import { countCrossings, transposeRanks } from "./crossings";

const link = (from: string, to: string): DiagramEdge => ({
  from,
  to,
  label: null,
  style: "solid",
  head: "arrow",
});

const ungrouped = new Map<string, string>();

describe("countCrossings", () => {
  it("counts nothing when the endpoints keep their order", () => {
    const ranks = [
      ["a", "b"],
      ["x", "y"],
    ];
    expect(countCrossings(ranks, [link("a", "x"), link("b", "y")])).toBe(0);
  });

  it("counts the pair whose endpoints are the other way round", () => {
    const ranks = [
      ["a", "b"],
      ["x", "y"],
    ];
    expect(countCrossings(ranks, [link("a", "y"), link("b", "x")])).toBe(1);
  });

  it("counts every crossing pair, not every crossed edge", () => {
    const ranks = [
      ["a", "b", "c"],
      ["x", "y", "z"],
    ];
    // Reversed wholesale: all three pairs cross.
    expect(countCrossings(ranks, [link("a", "z"), link("b", "y"), link("c", "x")])).toBe(3);
  });

  /** Two edges that do not span the same pair of ranks cannot cross. */
  it("ignores edges from different ranks", () => {
    const ranks = [["a"], ["b"], ["c"]];
    expect(countCrossings(ranks, [link("a", "b"), link("b", "c")])).toBe(0);
  });

  it("ignores an edge whose ends are not placed", () => {
    expect(countCrossings([["a"]], [link("a", "ghost")])).toBe(0);
  });
});

describe("transposeRanks", () => {
  it("swaps the pair that was the wrong way round", () => {
    const ranks = [
      ["a", "b"],
      ["x", "y"],
    ];
    const edges = [link("a", "y"), link("b", "x")];
    expect(countCrossings(transposeRanks(ranks, edges, ungrouped), edges)).toBe(0);
  });

  it("leaves an arrangement it cannot improve alone", () => {
    const ranks = [
      ["a", "b"],
      ["x", "y"],
    ];
    const edges = [link("a", "x"), link("b", "y")];
    expect(transposeRanks(ranks, edges, ungrouped)).toEqual(ranks);
  });

  it("never returns a worse arrangement than it was given", () => {
    const ranks = [
      ["a", "b", "c"],
      ["x", "y", "z"],
    ];
    const edges = [link("a", "z"), link("b", "x"), link("c", "y")];
    const after = transposeRanks(ranks, edges, ungrouped);
    expect(countCrossings(after, edges)).toBeLessThanOrEqual(countCrossings(ranks, edges));
  });

  /**
   * A band is the bounding box of its members. A swap that steps over a group
   * boundary makes the band cover a box that is not its own — the drawing then
   * says something false about the system to save a crossing.
   */
  it("will not step a box over a group boundary to save a crossing", () => {
    const groupOf = new Map([
      ["a", "left"],
      ["b", "right"],
      ["x", "left"],
      ["y", "right"],
    ]);
    const ranks = [
      ["a", "b"],
      ["x", "y"],
    ];
    const edges = [link("a", "y"), link("b", "x")];
    expect(transposeRanks(ranks, edges, groupOf)).toEqual(ranks);
  });
});
