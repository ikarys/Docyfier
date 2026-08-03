import type { DiagramAttrs, DiagramEdge, DiagramNode } from "../diagram";
import { bandsFor, headroomBefore } from "./bands";
import { labelAnchor, routeBackward, routeForward } from "./edges";
import {
  GAP_ACROSS,
  GAP_ALONG,
  GROUP_PAD,
  LANE_WIDTH,
  boxFrom,
  frame,
  uniformBoxSize,
  type BoxSize,
  type Placement,
  type PlacedBox,
  type PlacedEdge,
  type Point,
} from "./geometry";
import { isLane, laneLongEdges, type Detour } from "./long-edges";
import { straightenAlong } from "./straighten";
import { orderRanks, rankNodes, splitBackEdges, wrapWideRanks } from "./ranking";

/**
 * Rows of boxes with the flow running between them — flows and architectures.
 *
 * Every node sits one rank past the furthest thing that leads to it, which is
 * what makes a process read top to bottom without anyone choosing coordinates.
 * An edge that skips a rank stands in a lane of its own there rather than being
 * drawn over what it passes, and one that goes backwards travels in a lane
 * beside the drawing, so a retry loop does not cross the boxes it returns to.
 */
export function layered(attrs: DiagramAttrs): Placement {
  const { forward, back } = splitBackEdges(attrs.nodes, attrs.edges);
  // Lanes first: an edge that skips a rank becomes a run of hops through slots
  // of its own, so from here on every edge joins neighbours and no route has an
  // obstacle. Ordering then treats a lane like any other box.
  const { ranks: widened, hops, detours } = laneLongEdges(rankNodes(attrs.nodes, forward), forward);
  // Wrapped after ordering, never before: ordering is what puts a group's
  // members next to each other, and a row cut across that order would scatter
  // them over two rows with a band drawn around the gap.
  const ranks = wrapWideRanks(
    orderRanks(widened, attrs.nodes, hops, attrs.groups),
    hops,
    attrs.nodes,
  );
  const size = uniformBoxSize(attrs.nodes);
  const byId = new Map(attrs.nodes.map((n) => [n.id, n]));

  // Evenly spaced and centred is the honest first answer and it zigzags: a
  // chain through ranks of two, three and one box wanders for no reason a
  // reader can see. Straightening slides the boxes along their rank only.
  const all = straightenAlong(
    placeRanks(ranks, byId, size, attrs.direction, headroomBefore(ranks, attrs.nodes, attrs.groups)),
    ranks,
    hops,
    attrs.direction,
  );
  const placed = new Map(all.map((b) => [b.id, b]));
  const boxes = all.filter((box) => !isLane(box.id));
  return frame({
    boxes,
    groups: bandsFor(attrs, placed),
    edges: routeAll(detours, back, placed, attrs.direction, boxes),
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
  const across = (direction === "down" ? size.height : size.width) + GAP_ACROSS;
  // A lane takes a narrow slot rather than a whole one: a flow where four edges
  // skip a rank would otherwise be drawn twice as wide as it has boxes.
  const slot = (id: string): number =>
    isLane(id) ? LANE_WIDTH : direction === "down" ? size.width : size.height;
  const span = (rank: string[]): number =>
    rank.reduce((total, id) => total + slot(id), 0) + GAP_ALONG * (rank.length - 1);
  const widest = Math.max(...ranks.map(span));

  // Ranks are evenly spaced except where a band opens: that gap also carries
  // the names of the bands starting there, which are drawn above their top edge.
  let depth = 0;
  const starts = ranks.map((_, r) => (depth += r === 0 ? headroom[r] : across + headroom[r]));

  return ranks.flatMap((rank, r) => {
    let along = (widest - span(rank)) / 2;
    return rank.map((id) => {
      const at: Point =
        direction === "down" ? { x: along, y: starts[r] } : { x: starts[r], y: along };
      along += slot(id) + GAP_ALONG;
      return isLane(id) ? laneBox(id, at, size, direction) : boxFrom(byId.get(id) as DiagramNode, at, size);
    });
  });
}

/**
 * The box an edge stands in while passing a rank. It is as thick as the rank so
 * a hop can leave and enter it like any other box, and as narrow as a line
 * across, because nothing is drawn in it.
 */
function laneBox(id: string, at: Point, size: BoxSize, direction: "down" | "right"): PlacedBox {
  return {
    id,
    ...at,
    width: direction === "down" ? LANE_WIDTH : size.width,
    height: direction === "down" ? size.height : LANE_WIDTH,
    label: "",
    lines: [],
    note: null,
    noteLines: [],
    icon: null,
    accent: null,
  };
}

function routeAll(
  detours: Detour[],
  back: DiagramEdge[],
  placed: Map<string, PlacedBox>,
  direction: "down" | "right",
  boxes: PlacedBox[],
): PlacedEdge[] {
  const outer =
    direction === "down"
      ? Math.max(...boxes.map((b) => b.x + b.width))
      : Math.max(...boxes.map((b) => b.y + b.height));
  const routed = detours.map((detour) => draw(detour.edge, routeVia(detour, placed, direction)));
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

/**
 * One edge, drawn as the run of hops it was split into.
 *
 * Each hop is routed exactly as a short edge is, and the pieces join because a
 * hop ends at the top of the lane the next one leaves from the bottom of — a
 * vertical run through a slot no box occupies.
 */
function routeVia(detour: Detour, placed: Map<string, PlacedBox>, direction: "down" | "right"): Point[] {
  const stops = [detour.edge.from, ...detour.lanes, detour.edge.to].map(
    (id) => placed.get(id) as PlacedBox,
  );
  return stops.slice(1).flatMap((to, i) => routeForward(stops[i], to, direction));
}

function draw(edge: DiagramEdge, points: Point[]): PlacedEdge {
  return { ...edge, points, labelAt: edge.label ? labelAnchor(points) : null };
}
