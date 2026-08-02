import { acceptsPlaces, type DiagramAttrs, type DiagramDirection, type DiagramNode } from "../diagram";
import { bandsFor } from "./bands";
import { labelAnchor, routeForward } from "./edges";
import { frame, type PlacedBox, type PlacedEdge, type Placement } from "./geometry";

/**
 * The boxes a hand moved, laid over the drawing the layout computed.
 *
 * A place beats the layout for the box it names and for nothing else: the rest
 * of the drawing keeps the coordinates it was given, so moving one box never
 * rearranges the picture around it. What does follow is what a box owns — the
 * band of its group and the arrows that touch it — because a band left behind
 * or an arrow ending in mid-air says something false about the system.
 *
 * `realign` (`diagram-edits.ts`) drops every place, which is the way back: a
 * drawing dragged into a mess is one edit from the layout that knows how to
 * place it. `acceptsPlaces` (`diagram.ts`) says which kinds have that hand at
 * all — a sequence and a phase axis draw where the layout said, and refuse the
 * place rather than storing one they would ignore.
 */

export function withMovedBoxes(attrs: DiagramAttrs, placement: Placement): Placement {
  const moved = new Map(attrs.nodes.filter(isMoved).map((node) => [node.id, node]));
  if (moved.size === 0 || !acceptsPlaces(attrs.kind)) return placement;

  const boxes = placement.boxes.map((box) => {
    const at = moved.get(box.id);
    return at ? { ...box, x: at.x, y: at.y } : box;
  });
  const placed = new Map(boxes.map((box) => [box.id, box]));
  // Framed, not merely resized: growing the canvas answers a box dropped past
  // the right or the bottom, and says nothing about one dropped at the corner,
  // whose band — and the name drawn a header above that band — land at negative
  // coordinates that every `viewBox="0 0 …"` renderer drops on the floor.
  return frame({
    boxes,
    groups: bandsFor(attrs, placed),
    rails: placement.rails,
    edges: placement.edges.map((edge) => reroute(edge, moved, placed, attrs.direction)),
  });
}

function isMoved(node: DiagramNode): node is DiagramNode & { x: number; y: number } {
  return node.x !== undefined && node.y !== undefined;
}

/**
 * An arrow with a moved end is drawn straight between the two boxes.
 *
 * The lane an edge stood in to pass a rank, and the detour a loop took beside
 * the drawing, were answers to where the layout had put things; once a box has
 * been dropped somewhere else they answer nothing. The arrows nobody disturbed
 * keep their route, lanes and all.
 */
function reroute(
  edge: PlacedEdge,
  moved: Map<string, DiagramNode>,
  placed: Map<string, PlacedBox>,
  direction: DiagramDirection,
): PlacedEdge {
  if (!moved.has(edge.from) && !moved.has(edge.to)) return edge;
  const from = placed.get(edge.from);
  const to = placed.get(edge.to);
  if (!from || !to) return edge;
  const points = routeForward(from, to, direction);
  return { ...edge, points, labelAt: edge.label ? labelAnchor(points) : null };
}
