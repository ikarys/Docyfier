import { describe, expect, it } from "vitest";
import type { DiagramAttrs } from "../diagram";
import { placeNodes } from "./place";
import { GROUP_HEADER, type PlacedGroup } from "./geometry";

/**
 * What a band has to enclose (PLAN.md STEP 10).
 *
 * A band used to be the bounding box of its own member boxes, which is right
 * until a group holds another group: the parent would then be drawn beside its
 * child instead of around it, and the nesting an architecture drawing exists to
 * show would be gone. The rule is stated over a placed diagram rather than over
 * the geometry alone, because "inside" is a claim about coordinates.
 */

const base: Omit<DiagramAttrs, "nodes" | "groups"> = {
  kind: "architecture",
  direction: "down",
  edges: [],
  title: null,
  caption: null,
};

/** A subscription holding a cluster, holding two namespaces with a box each. */
const nested: DiagramAttrs = {
  ...base,
  groups: [
    { id: "sub", label: "Subscription" },
    { id: "aks", label: "AKS cluster", parent: "sub" },
    { id: "dev", label: "dev/", parent: "aks" },
    { id: "uat", label: "uat/", parent: "aks" },
  ],
  nodes: [
    { id: "a", label: "kv v2", group: "dev" },
    { id: "b", label: "policies", group: "uat" },
  ],
};

function bandOf(groups: PlacedGroup[], id: string): PlacedGroup {
  const band = groups.find((group) => group.id === id);
  if (!band) throw new Error(`no band for "${id}"`);
  return band;
}

/** Whether `outer` covers every corner of `inner`. */
function encloses(outer: PlacedGroup, inner: PlacedGroup): boolean {
  return (
    outer.x <= inner.x &&
    outer.y <= inner.y &&
    outer.x + outer.width >= inner.x + inner.width &&
    outer.y + outer.height >= inner.y + inner.height
  );
}

describe("a band around a band", () => {
  const placed = placeNodes(nested);

  it("draws every declared group that has something in it", () => {
    expect(placed.groups.map((group) => group.id).sort()).toEqual([
      "aks",
      "dev",
      "sub",
      "uat",
    ]);
  });

  it("puts a child band inside its parent", () => {
    expect(encloses(bandOf(placed.groups, "aks"), bandOf(placed.groups, "dev"))).toBe(true);
    expect(encloses(bandOf(placed.groups, "aks"), bandOf(placed.groups, "uat"))).toBe(true);
    expect(encloses(bandOf(placed.groups, "sub"), bandOf(placed.groups, "aks"))).toBe(true);
  });

  it("leaves room between the two, so the nesting is visible", () => {
    const outer = bandOf(placed.groups, "sub");
    const inner = bandOf(placed.groups, "aks");
    expect(inner.x - outer.x).toBeGreaterThan(0);
    expect(inner.y - outer.y).toBeGreaterThan(0);
  });

  it("hands the outer bands over first, since a band is filled", () => {
    const order = placed.groups.map((group) => group.id);
    expect(order.indexOf("sub")).toBeLessThan(order.indexOf("aks"));
    expect(order.indexOf("aks")).toBeLessThan(order.indexOf("dev"));
  });

  it("keeps the whole drawing inside the frame it reports", () => {
    for (const group of placed.groups) {
      expect(group.x).toBeGreaterThanOrEqual(0);
      expect(group.y).toBeGreaterThanOrEqual(0);
      expect(group.x + group.width).toBeLessThanOrEqual(placed.width);
      expect(group.y + group.height).toBeLessThanOrEqual(placed.height);
    }
  });
});

/**
 * A band's name is written in the strip just above it. Nothing else may be
 * drawn there: the wrapped architecture put a row of the parent's own boxes
 * directly over the child band, and "AKS cluster astro_shared_dev" came out
 * struck through by a box that had nothing to do with it.
 */
describe("the strip a band writes its name in", () => {
  const wrapped: DiagramAttrs = {
    ...base,
    groups: [
      { id: "sub", label: "subscription astro_shared_dev (westeurope)" },
      { id: "aks", label: "AKS cluster astro_shared_dev", parent: "sub" },
      { id: "bao", label: "OpenBao instance", parent: "aks" },
    ],
    nodes: [
      { id: "kv", label: "Platform KV", group: "sub" },
      { id: "mi", label: "Managed Identity", group: "sub" },
      { id: "st", label: "Backup ST", group: "sub" },
      { id: "snap", label: "raft snapshots", group: "sub" },
      { id: "aksn", label: "AKS cluster", group: "aks" },
      { id: "root", label: "Root namespace", group: "bao" },
      { id: "dev", label: 'ns "dev/"', group: "bao" },
      { id: "uat", label: 'ns "uat/"', group: "bao" },
    ],
  };

  it("is left clear of every box", () => {
    const placed = placeNodes(wrapped);
    for (const band of placed.groups) {
      const top = band.y - GROUP_HEADER;
      const overlapping = placed.boxes.filter(
        (box) =>
          box.y < band.y &&
          box.y + box.height > top &&
          box.x < band.x + band.width &&
          box.x + box.width > band.x,
      );
      expect(`${band.id}: ${overlapping.map((box) => box.id).join(", ")}`).toBe(`${band.id}: `);
    }
  });
});

describe("a group that holds nothing at all", () => {
  it("is not drawn, however deep it was declared", () => {
    const empty: DiagramAttrs = {
      ...base,
      groups: [
        { id: "sub", label: "Subscription" },
        { id: "ghost", label: "Nothing", parent: "sub" },
      ],
      nodes: [{ id: "a", label: "Alone", group: "sub" }],
    };
    expect(placeNodes(empty).groups.map((group) => group.id)).toEqual(["sub"]);
  });
});
