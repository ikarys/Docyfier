import { describe, expect, it } from "vitest";
import type { DiagramGroup } from "./diagram";
import { groupCycle, groupDepth, groupOrder, groupPath, outermostFirst } from "./group-tree";

/**
 * What "inside" means for a group (PLAN.md STEP 10).
 *
 * An architecture drawing is almost always nested — a subscription holds a
 * cluster, which holds an instance, which holds namespaces — and a flat list of
 * bands cannot say so. The tree those parents make is read here, once, because
 * three things need it: the validation that refuses a cycle, the ranking that
 * keeps a subtree together, and the geometry that draws one band inside another.
 */

const flat: DiagramGroup[] = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
];

const nested: DiagramGroup[] = [
  { id: "sub", label: "Subscription" },
  { id: "aks", label: "AKS cluster", parent: "sub" },
  { id: "bao", label: "OpenBao", parent: "aks" },
  { id: "dev", label: "dev/", parent: "bao" },
  { id: "uat", label: "uat/", parent: "bao" },
];

describe("how deep a group sits", () => {
  it("puts every group of a flat diagram at the top", () => {
    expect(flat.map((g) => groupDepth(flat, g.id))).toEqual([0, 0]);
  });

  it("counts the parents above a group", () => {
    expect(groupDepth(nested, "sub")).toBe(0);
    expect(groupDepth(nested, "bao")).toBe(2);
    expect(groupDepth(nested, "uat")).toBe(3);
  });

  it("treats a parent nobody declared as no parent at all", () => {
    const orphan: DiagramGroup[] = [{ id: "x", label: "X", parent: "gone" }];
    expect(groupDepth(orphan, "x")).toBe(0);
  });
});

describe("the path that keeps a subtree together", () => {
  it("names every group above one, outermost first", () => {
    expect(groupPath(nested, "dev")).toEqual(["sub", "aks", "bao", "dev"]);
  });

  it("is the group itself when it has no parent", () => {
    expect(groupPath(nested, "sub")).toEqual(["sub"]);
  });

  /**
   * Two groups under one parent sort next to each other and away from anything
   * outside it, which is what stops a band from being drawn over a stranger.
   */
  it("shares its head between siblings", () => {
    const dev = groupPath(nested, "dev");
    const uat = groupPath(nested, "uat");
    expect(dev.slice(0, 3)).toEqual(uat.slice(0, 3));
  });
});

describe("the order that keeps a subtree contiguous", () => {
  /**
   * `ranking.ts` sorts a rank on this number. Numbering the tree depth first
   * means a whole subtree takes a run of consecutive numbers, so sorting on it
   * never interleaves two branches — which is what would make a band a comb.
   */
  it("numbers a subtree without a gap", () => {
    const order = groupOrder(nested);
    expect(order.get("sub")).toBeLessThan(order.get("aks") as number);
    expect(Math.abs((order.get("dev") as number) - (order.get("uat") as number))).toBe(1);
  });

  it("keeps two branches apart", () => {
    const twoBranches: DiagramGroup[] = [
      { id: "left", label: "L" },
      { id: "leftIn", label: "LI", parent: "left" },
      { id: "right", label: "R" },
      { id: "rightIn", label: "RI", parent: "right" },
    ];
    const order = groupOrder(twoBranches);
    expect(order.get("leftIn")).toBeLessThan(order.get("right") as number);
  });

  it("numbers every group, cycle or not", () => {
    const ring: DiagramGroup[] = [
      { id: "a", label: "A", parent: "b" },
      { id: "b", label: "B", parent: "a" },
    ];
    expect(groupOrder(ring).size).toBe(2);
  });
});

describe("a group that contains itself", () => {
  it("finds a group that is its own parent", () => {
    expect(groupCycle([{ id: "a", label: "A", parent: "a" }])).toBe("a");
  });

  it("finds a ring of any length", () => {
    expect(
      groupCycle([
        { id: "a", label: "A", parent: "c" },
        { id: "b", label: "B", parent: "a" },
        { id: "c", label: "C", parent: "b" },
      ]),
    ).not.toBeNull();
  });

  it("says nothing of a tree", () => {
    expect(groupCycle(nested)).toBeNull();
  });

  /** A cycle makes depth unanswerable; it must not make it unending. */
  it("does not hang measuring a group inside a ring", () => {
    const ring: DiagramGroup[] = [
      { id: "a", label: "A", parent: "b" },
      { id: "b", label: "B", parent: "a" },
    ];
    expect(groupDepth(ring, "a")).toBeGreaterThanOrEqual(0);
  });
});

describe("the order the bands are drawn in", () => {
  /**
   * A band is a filled rectangle, so an inner one drawn first would be buried
   * by its own parent. Outermost first is the only order that shows the nesting.
   */
  it("hands the outer groups over before the ones inside them", () => {
    const order = outermostFirst(nested).map((g) => g.id);
    expect(order.indexOf("sub")).toBeLessThan(order.indexOf("aks"));
    expect(order.indexOf("aks")).toBeLessThan(order.indexOf("bao"));
    expect(order.indexOf("bao")).toBeLessThan(order.indexOf("dev"));
  });

  it("keeps every group, and only reorders", () => {
    expect(outermostFirst(nested).map((g) => g.id).sort()).toEqual(
      nested.map((g) => g.id).sort(),
    );
  });
});
