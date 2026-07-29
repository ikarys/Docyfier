import type { DiagramAttrs } from "../diagram";
import {
  GAP_ALONG,
  boxFrom,
  frame,
  uniformBoxSize,
  type Placement,
  type PlacedEdge,
  type Rail,
} from "./geometry";

/**
 * Participants across the top, messages running down — sequences.
 *
 * Time is the vertical axis and it is not negotiable, so this layout ignores
 * `direction`: a sequence read left to right would stop being a sequence.
 * Every message takes the next row, which keeps the order of `edges` visible
 * in the drawing exactly as it was declared.
 */

const MESSAGE_ROW = 46;
const LIFELINE_TAIL = 24;

export function lanes(attrs: DiagramAttrs): Placement {
  const size = uniformBoxSize(attrs.nodes);
  const step = size.width + GAP_ALONG;
  const centre = new Map<string, number>();

  const boxes = attrs.nodes.map((n, i) => {
    centre.set(n.id, i * step + size.width / 2);
    return boxFrom(n, { x: i * step, y: 0 }, size);
  });

  const bottom = size.height + attrs.edges.length * MESSAGE_ROW + LIFELINE_TAIL;
  const rails: Rail[] = attrs.nodes.map((n) => ({
    kind: "lifeline",
    from: { x: centre.get(n.id) as number, y: size.height },
    to: { x: centre.get(n.id) as number, y: bottom },
  }));

  return frame({ boxes, groups: [], rails, edges: messages(attrs, centre, size.height) });
}

function messages(
  attrs: DiagramAttrs,
  centre: Map<string, number>,
  top: number,
): PlacedEdge[] {
  return attrs.edges.map((e, i) => {
    const y = top + (i + 1) * MESSAGE_ROW;
    const points = [
      { x: centre.get(e.from) as number, y },
      { x: centre.get(e.to) as number, y },
    ];
    return {
      ...e,
      points,
      labelAt: e.label ? { x: (points[0].x + points[1].x) / 2, y } : null,
    };
  });
}
