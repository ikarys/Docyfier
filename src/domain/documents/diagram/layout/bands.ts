import type { DiagramAttrs, DiagramGroup, DiagramNode } from "../diagram";
import { groupPath, outermostFirst } from "../group-tree";
import { GROUP_HEADER, GROUP_PAD, type PlacedBox, type PlacedGroup } from "./geometry";

/**
 * The bands behind the boxes, one per group that holds something.
 *
 * A band is the bounding box of what belongs to its group — and what belongs to
 * a group includes the bands of the groups inside it, which is the whole of
 * STEP 10's nesting. Computed innermost first so a parent can measure a child
 * that already knows its own size, and handed back outermost first because a
 * band is filled: drawn the other way round, a parent would bury its children.
 *
 * `ranking.ts` keeps a subtree adjacent inside a rank, so a band stays a
 * rectangle rather than a comb. One spread across many ranks may still cover a
 * box that is not its own; that reads as a zone rather than as a mistake, and
 * it is the price of not turning this into a constrained layout problem.
 */

/** A parent leaves this much air around its children, and room for their names. */
const NEST_PAD = GROUP_PAD + GROUP_HEADER;

interface Extent {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

function around(extents: Extent[], pad: number): Extent {
  return {
    x: Math.min(...extents.map((e) => e.x)) - pad,
    y: Math.min(...extents.map((e) => e.y)) - pad,
    right: Math.max(...extents.map((e) => e.right)) + pad,
    bottom: Math.max(...extents.map((e) => e.bottom)) + pad,
  };
}

export function bandsFor(attrs: DiagramAttrs, placed: Map<string, PlacedBox>): PlacedGroup[] {
  const measured = new Map<string, Extent>();

  // Innermost first: a parent's extent is read off children that already have
  // one, so every group is measured exactly once and nothing recurses.
  for (const group of [...outermostFirst(attrs.groups)].reverse()) {
    const own = memberExtents(attrs, group, placed);
    const inside = childExtents(attrs, group, measured);
    const parts = [...own, ...inside];
    if (parts.length === 0) continue;
    measured.set(group.id, around(parts, inside.length ? NEST_PAD : GROUP_PAD));
  }

  return outermostFirst(attrs.groups).flatMap((group) => {
    const extent = measured.get(group.id);
    if (!extent) return [];
    return [
      {
        id: group.id,
        label: group.label,
        x: extent.x,
        y: extent.y,
        width: extent.right - extent.x,
        height: extent.bottom - extent.y,
      },
    ];
  });
}

/**
 * How much air to leave above each rank, so the bands starting there can write
 * their names without striking through the boxes on the rank before.
 *
 * A band's name is drawn in the strip just above its top edge, and its top edge
 * follows its first member. Ranks are otherwise evenly spaced, so a rank that
 * opens three nested bands needs three strips more than one that opens none.
 */
export function headroomBefore(
  ranks: string[][],
  nodes: readonly DiagramNode[],
  groups: readonly DiagramGroup[],
): number[] {
  const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? ""]));
  const open = new Set<string>();
  return ranks.map((rank) => {
    const starting = rank
      .flatMap((id) => groupPath(groups, groupOf.get(id) ?? ""))
      .filter((id) => !open.has(id));
    for (const id of starting) open.add(id);
    return new Set(starting).size * GROUP_HEADER;
  });
}

function memberExtents(
  attrs: DiagramAttrs,
  group: DiagramGroup,
  placed: Map<string, PlacedBox>,
): Extent[] {
  return attrs.nodes
    .filter((node) => node.group === group.id)
    .map((node) => placed.get(node.id))
    .filter((box): box is PlacedBox => box !== undefined)
    .map((box) => ({ x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height }));
}

/** The bands of the groups this one holds, skipping any that drew nothing. */
function childExtents(
  attrs: DiagramAttrs,
  group: DiagramGroup,
  measured: Map<string, Extent>,
): Extent[] {
  return attrs.groups
    .filter((other) => other.parent === group.id)
    .map((child) => measured.get(child.id))
    .filter((extent): extent is Extent => extent !== undefined);
}
