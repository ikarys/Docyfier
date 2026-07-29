import type { DiagramAttrs } from "../diagram";
import {
  GAP_ALONG,
  boxFrom,
  frame,
  uniformBoxSize,
  type BoxSize,
  type Placement,
  type PlacedBox,
  type Point,
  type Rail,
} from "./geometry";

/**
 * Phases strung along an axis — timelines and roadmaps.
 *
 * The order is the order of the nodes, which is why `validation.ts` refuses
 * edges here: an arrow would be restating what the axis already says.
 */

const AXIS_GAP = 26;
const TICK = 7;

export function timeline(attrs: DiagramAttrs): Placement {
  const size = uniformBoxSize(attrs.nodes);
  const boxes = attrs.nodes.map((n, i) => boxFrom(n, at(i, size, attrs.direction), size));
  return frame({
    boxes,
    groups: [],
    edges: [],
    rails: [axisFor(boxes, attrs.direction), ...ticks(boxes, attrs.direction)],
  });
}

function at(index: number, size: BoxSize, direction: "down" | "right"): Point {
  const step = (direction === "right" ? size.width : size.height) + GAP_ALONG;
  return direction === "right"
    ? { x: index * step, y: AXIS_GAP }
    : { x: AXIS_GAP, y: index * step };
}

function axisFor(boxes: PlacedBox[], direction: "down" | "right"): Rail {
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  if (direction === "right") {
    return {
      kind: "axis",
      from: { x: first.x, y: 0 },
      to: { x: last.x + last.width, y: 0 },
    };
  }
  return {
    kind: "axis",
    from: { x: 0, y: first.y },
    to: { x: 0, y: last.y + last.height },
  };
}

/** A mark on the axis for each phase, at the middle of the box it belongs to. */
function ticks(boxes: PlacedBox[], direction: "down" | "right"): Rail[] {
  return boxes.map((b) =>
    direction === "right"
      ? { kind: "tick", from: { x: b.x + b.width / 2, y: -TICK }, to: { x: b.x + b.width / 2, y: TICK } }
      : { kind: "tick", from: { x: -TICK, y: b.y + b.height / 2 }, to: { x: TICK, y: b.y + b.height / 2 } },
  );
}
