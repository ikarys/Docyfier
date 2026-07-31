import type { DiagramAttrs, DiagramEdge, DiagramNode } from "../diagram";
import { bandsFor, headroomBefore } from "./bands";
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
  type Point,
} from "./geometry";
import { orderRanks, rankNodes, splitBackEdges, wrapWideRanks } from "./ranking";

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
  // Wrapped after ordering, never before: ordering is what puts a group's
  // members next to each other, and a row cut across that order would scatter
  // them over two rows with a band drawn around the gap.
  const ranks = wrapWideRanks(
    orderRanks(rankNodes(attrs.nodes, forward), attrs.nodes, forward, attrs.groups),
    forward,
    attrs.nodes,
  );
  const size = uniformBoxSize(attrs.nodes);
  const byId = new Map(attrs.nodes.map((n) => [n.id, n]));

  const boxes = placeRanks(
    ranks,
    byId,
    size,
    attrs.direction,
    headroomBefore(ranks, attrs.nodes, attrs.groups),
  );
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
  headroom: number[],
): PlacedBox[] {
  const along = (direction === "down" ? size.width : size.height) + GAP_ALONG;
  const across = (direction === "down" ? size.height : size.width) + GAP_ACROSS;
  const widest = Math.max(...ranks.map((r) => r.length));
  // Ranks are evenly spaced except where a band opens: that gap also carries
  // the names of the bands starting there, which are drawn above their top edge.
  let depth = 0;
  const starts = ranks.map((_, r) => (depth += r === 0 ? headroom[r] : across + headroom[r]));
  return ranks.flatMap((rank, r) =>
    rank.map((id, i) => {
      const offset = ((widest - rank.length) * along) / 2;
      const at: Point =
        direction === "down"
          ? { x: offset + i * along, y: starts[r] }
          : { x: starts[r], y: offset + i * along };
      return boxFrom(byId.get(id) as DiagramNode, at, size);
    }),
  );
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
