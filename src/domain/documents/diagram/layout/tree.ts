import type { DiagramAttrs, DiagramNode } from "../diagram";
import { labelAnchor, routeForward } from "./edges";
import {
  GAP_ACROSS,
  GAP_ALONG,
  boxFrom,
  frame,
  uniformBoxSize,
  type BoxSize,
  type Placement,
  type PlacedBox,
  type Point,
} from "./geometry";

/**
 * A tree, each parent centred over the children it owns — hierarchies.
 *
 * Leaves take the next free slot along the drawing and parents sit at the
 * middle of their own, which is the property that makes an org chart look
 * balanced without any measurement of subtree width.
 */
export function tree(attrs: DiagramAttrs): Placement {
  const childrenOf = new Map<string, string[]>(attrs.nodes.map((n) => [n.id, []]));
  const hasParent = new Set<string>();
  for (const e of attrs.edges) {
    childrenOf.get(e.from)?.push(e.to);
    hasParent.add(e.to);
  }
  const root = attrs.nodes.find((n) => !hasParent.has(n.id)) as DiagramNode;

  const slot = new Map<string, number>();
  const depth = new Map<string, number>();
  assign(root.id, 0, childrenOf, slot, depth, { next: 0 });

  const size = uniformBoxSize(attrs.nodes);
  const boxes = attrs.nodes.map((n) =>
    boxFrom(n, at(slot.get(n.id) ?? 0, depth.get(n.id) ?? 0, size, attrs.direction), size),
  );
  const placed = new Map(boxes.map((b) => [b.id, b]));
  return frame({
    boxes,
    groups: [],
    rails: [],
    edges: attrs.edges.map((e) => {
      const points = routeForward(
        placed.get(e.from) as PlacedBox,
        placed.get(e.to) as PlacedBox,
        attrs.direction,
      );
      return { ...e, points, labelAt: e.label ? labelAnchor(points) : null };
    }),
  });
}

/** Depth-first: leaves consume slots in order, a parent lands between its own. */
function assign(
  id: string,
  level: number,
  childrenOf: Map<string, string[]>,
  slot: Map<string, number>,
  depth: Map<string, number>,
  cursor: { next: number },
): void {
  depth.set(id, level);
  const children = childrenOf.get(id) ?? [];
  if (children.length === 0) {
    slot.set(id, cursor.next);
    cursor.next += 1;
    return;
  }
  for (const child of children) assign(child, level + 1, childrenOf, slot, depth, cursor);
  const first = slot.get(children[0]) ?? 0;
  const last = slot.get(children[children.length - 1]) ?? 0;
  slot.set(id, (first + last) / 2);
}

function at(slot: number, level: number, size: BoxSize, direction: "down" | "right"): Point {
  const along = (direction === "down" ? size.width : size.height) + GAP_ALONG;
  const across = (direction === "down" ? size.height : size.width) + GAP_ACROSS;
  return direction === "down"
    ? { x: slot * along, y: level * across }
    : { x: level * across, y: slot * along };
}
