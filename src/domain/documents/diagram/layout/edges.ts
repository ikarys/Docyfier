import type { PlacedBox, Point } from "./geometry";

/**
 * Orthogonal edge routes.
 *
 * The layouts place on a grid with a clear gap between ranks, and an edge that
 * skips a rank is split into hops through a lane of its own before it gets
 * here (`long-edges.ts`). So a forward edge never has an obstacle to avoid: it
 * always leaves one rank, crosses the gap and arrives at the next. Only an edge
 * that goes backwards travels past boxes, in a lane beside the drawing.
 */

export type Axis = "down" | "right";

function exit(box: PlacedBox, axis: Axis): Point {
  return axis === "down"
    ? { x: box.x + box.width / 2, y: box.y + box.height }
    : { x: box.x + box.width, y: box.y + box.height / 2 };
}

function entry(box: PlacedBox, axis: Axis): Point {
  return axis === "down"
    ? { x: box.x + box.width / 2, y: box.y }
    : { x: box.x, y: box.y + box.height / 2 };
}

/** A forward route: out of `from`, across the gap between the two ranks, into `to`. */
export function routeForward(from: PlacedBox, to: PlacedBox, axis: Axis): Point[] {
  const start = exit(from, axis);
  const end = entry(to, axis);
  if (axis === "down") {
    if (Math.abs(start.x - end.x) < 0.5) return [start, end];
    const mid = (start.y + end.y) / 2;
    return [start, { x: start.x, y: mid }, { x: end.x, y: mid }, end];
  }
  if (Math.abs(start.y - end.y) < 0.5) return [start, end];
  const mid = (start.x + end.x) / 2;
  return [start, { x: mid, y: start.y }, { x: mid, y: end.y }, end];
}

/**
 * A backward route, travelling in a lane cleared beside the drawing.
 *
 * `lane` is a coordinate on the across-axis outside every box, so successive
 * back edges can be given lanes of their own and never overlap.
 */
export function routeBackward(from: PlacedBox, to: PlacedBox, axis: Axis, lane: number): Point[] {
  if (axis === "down") {
    const start = { x: from.x + from.width, y: from.y + from.height / 2 };
    const end = { x: to.x + to.width, y: to.y + to.height / 2 };
    return [start, { x: lane, y: start.y }, { x: lane, y: end.y }, end];
  }
  const start = { x: from.x + from.width / 2, y: from.y + from.height };
  const end = { x: to.x + to.width / 2, y: to.y + to.height };
  return [start, { x: start.x, y: lane }, { x: end.x, y: lane }, end];
}

/** Where an edge label sits: the middle of the route's longest straight run. */
export function labelAnchor(points: Point[]): Point {
  let best = 0;
  let bestLength = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const length = Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y);
    if (length > bestLength) {
      bestLength = length;
      best = i;
    }
  }
  const a = points[best];
  const b = points[best + 1];
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
