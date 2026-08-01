import type { DiagramDirection, EdgeHead } from "@/domain/documents/diagram/diagram";
import type { Placement, Point } from "@/domain/documents/diagram/layout/geometry";

/**
 * The placement, in the shape the editing library expects.
 *
 * This is the whole of what ties Docyfier to React Flow, together with the
 * components beside it: the domain computes a `Placement`, this file restates
 * it, and the edits a gesture triggers are the ones `diagram-edits.ts` already
 * declares. Another library means another folder next to this one — nothing
 * above `components/diagram/` changes.
 *
 * Shapes are declared here rather than imported from `@xyflow/react` for the
 * same reason: they are structurally what it takes, and a test can build one
 * without a DOM.
 */

const BOX = "box:";
const BAND = "band:";

export interface BoxData {
  lines: string[];
  note: string | null;
  accent: number | null;
  direction: DiagramDirection;
}

export interface BandData {
  label: string;
}

export interface FlowNode {
  id: string;
  type: "box" | "band";
  position: Point;
  width: number;
  height: number;
  data: BoxData | BandData;
  draggable: boolean;
  selectable: boolean;
  zIndex: number;
}

export interface WireData {
  points: Point[];
  dashed: boolean;
  head: EdgeHead;
  label: string | null;
  direction: DiagramDirection;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type: "wire";
  data: WireData;
  zIndex: number;
}

export function toFlow(
  placement: Placement,
  direction: DiagramDirection,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  return {
    nodes: [
      ...placement.groups.map((band) => ({
        id: `${BAND}${band.id}`,
        type: "band" as const,
        position: { x: band.x, y: band.y },
        width: band.width,
        height: band.height,
        data: { label: band.label },
        draggable: false,
        selectable: false,
        zIndex: 0,
      })),
      ...placement.boxes.map((box) => ({
        id: `${BOX}${box.id}`,
        type: "box" as const,
        position: { x: box.x, y: box.y },
        width: box.width,
        height: box.height,
        data: { lines: box.lines, note: box.note, accent: box.accent, direction },
        draggable: true,
        selectable: true,
        zIndex: 2,
      })),
    ],
    // Indexed, because a diagram may state the same link twice — once dashed
    // and once not — and two nodes sharing an id is a drawing that loses one.
    edges: placement.edges.map((edge, i) => ({
      id: `wire:${i}`,
      source: `${BOX}${edge.from}`,
      target: `${BOX}${edge.to}`,
      type: "wire" as const,
      data: {
        points: edge.points,
        dashed: edge.style === "dashed",
        head: edge.head,
        label: edge.label,
        direction,
      },
      zIndex: 1,
    })),
  };
}

/** The node a dragged box stands for, or null when the library moved something else. */
export function boxIdOf(flowId: string): string | null {
  return flowId.startsWith(BOX) ? flowId.slice(BOX.length) : null;
}
