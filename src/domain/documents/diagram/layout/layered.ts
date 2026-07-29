import type { DiagramAttrs, DiagramEdge, DiagramNode } from "../diagram";
import { labelAnchor, routeBackward, routeForward } from "./edges";
import {
  GAP_ACROSS,
  GAP_ALONG,
  GROUP_PAD,
  boxFrom,
  frame,
  uniformBoxSize,
  type BoxSize,
  type Placement,
  type PlacedBox,
  type PlacedEdge,
  type PlacedGroup,
  type Point,
} from "./geometry";
import { orderRanks, rankNodes, splitBackEdges } from "./ranking";

/**
 * Rows of boxes with the flow running between them — flows and architectures.
 *
 * Every node sits one rank past the furthest thing that leads to it, which is
 * what makes a process read top to bottom without anyone choosing coordinates.
 * Edges that go backwards are routed in a lane beside the drawing rather than
 * through it, so a retry loop does not cross the boxes it returns to.
 */
export function layered(attrs: DiagramAttrs): Placement {
  const { forward, back } = splitBackEdges(attrs.nodes, attrs.edges);
  const ranks = orderRanks(rankNodes(attrs.nodes, forward), attrs.nodes, forward);
  const size = uniformBoxSize(attrs.nodes);
  const byId = new Map(attrs.nodes.map((n) => [n.id, n]));

  const boxes = placeRanks(ranks, byId, size, attrs.direction);
  const placed = new Map(boxes.map((b) => [b.id, b]));
  return frame({
    boxes,
    groups: bandsFor(attrs, placed),
    edges: routeAll(forward, back, placed, attrs.direction, boxes),
    rails: [],
  });
}

function placeRanks(
  ranks: string[][],
  byId: Map<string, DiagramNode>,
  size: BoxSize,
  direction: "down" | "right",
): PlacedBox[] {
  const along = (direction === "down" ? size.width : size.height) + GAP_ALONG;
  const across = (direction === "down" ? size.height : size.width) + GAP_ACROSS;
  const widest = Math.max(...ranks.map((r) => r.length));
  return ranks.flatMap((rank, r) =>
    rank.map((id, i) => {
      const offset = ((widest - rank.length) * along) / 2;
      const at: Point =
        direction === "down"
          ? { x: offset + i * along, y: r * across }
          : { x: r * across, y: offset + i * along };
      return boxFrom(byId.get(id) as DiagramNode, at, size);
    }),
  );
}

/**
 * A band behind the members of a group.
 *
 * `ranking.ts` keeps a group's members adjacent inside a rank, so the band is
 * their bounding box. A group spread across many ranks may cover a node that is
 * not its own; that reads as a zone rather than a mistake, and it is the price
 * of not turning this into a constrained layout problem.
 */
function bandsFor(attrs: DiagramAttrs, placed: Map<string, PlacedBox>): PlacedGroup[] {
  return attrs.groups.flatMap((group) => {
    const members = attrs.nodes
      .filter((n) => n.group === group.id)
      .map((n) => placed.get(n.id))
      .filter((b): b is PlacedBox => b !== undefined);
    if (members.length === 0) return [];
    const x = Math.min(...members.map((b) => b.x)) - GROUP_PAD;
    const y = Math.min(...members.map((b) => b.y)) - GROUP_PAD;
    return [
      {
        id: group.id,
        label: group.label,
        x,
        y,
        width: Math.max(...members.map((b) => b.x + b.width)) + GROUP_PAD - x,
        height: Math.max(...members.map((b) => b.y + b.height)) + GROUP_PAD - y,
      },
    ];
  });
}

function routeAll(
  forward: DiagramEdge[],
  back: DiagramEdge[],
  placed: Map<string, PlacedBox>,
  direction: "down" | "right",
  boxes: PlacedBox[],
): PlacedEdge[] {
  const outer =
    direction === "down"
      ? Math.max(...boxes.map((b) => b.x + b.width))
      : Math.max(...boxes.map((b) => b.y + b.height));
  const routed = forward.map((e) =>
    draw(e, routeForward(placed.get(e.from) as PlacedBox, placed.get(e.to) as PlacedBox, direction)),
  );
  const looped = back.map((e, i) =>
    draw(
      e,
      routeBackward(
        placed.get(e.from) as PlacedBox,
        placed.get(e.to) as PlacedBox,
        direction,
        outer + GROUP_PAD + i * 14,
      ),
    ),
  );
  return [...routed, ...looped];
}

function draw(edge: DiagramEdge, points: Point[]): PlacedEdge {
  return { ...edge, points, labelAt: edge.label ? labelAnchor(points) : null };
}
