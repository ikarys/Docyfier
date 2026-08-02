import {
  acceptsPlaces,
  type DiagramDirection,
  type DiagramKind,
  type EdgeHead,
} from "@/domain/documents/diagram/diagram";
import type {
  PlacedBox,
  PlacedEdge,
  PlacedGroup,
  Placement,
  Point,
} from "@/domain/documents/diagram/layout/geometry";

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
  /** The label as written; `lines` is the same text broken to the box's width. */
  label: string;
  lines: string[];
  note: string | null;
  accent: number | null;
  direction: DiagramDirection;
  /**
   * Whether a box has room for a second line at all.
   *
   * Every box in a diagram is one size, and that size carries a note only when
   * some box has one (`uniformBoxSize`). So a diagram where nobody wrote a note
   * cannot offer to add one here: the words would hang out of the box, and
   * growing the box would draw something the exported SVG does not.
   */
  roomForNote: boolean;
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
  /** Where the arrow sits in the diagram's own list, which is how an edit names it. */
  index: number;
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
  kind: DiagramKind,
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const roomForNote = placement.boxes.some((box) => box.note !== null);
  const movable = acceptsPlaces(kind);
  return {
    nodes: [
      ...placement.groups.map(bandNode),
      ...placement.boxes.map((box) => boxNode(box, { direction, roomForNote, movable })),
    ],
    edges: placement.edges.map((edge, index) => wireEdge(edge, index, direction)),
  };
}

/** A band is scenery: it is drawn behind the boxes and answers to no gesture. */
function bandNode(band: PlacedGroup): FlowNode {
  return {
    id: `${BAND}${band.id}`,
    type: "band",
    position: { x: band.x, y: band.y },
    width: band.width,
    height: band.height,
    data: { label: band.label },
    draggable: false,
    selectable: false,
    zIndex: 0,
  };
}

function boxNode(
  box: PlacedBox,
  { direction, roomForNote, movable }: BoxContext,
): FlowNode {
  return {
    id: `${BOX}${box.id}`,
    type: "box",
    position: { x: box.x, y: box.y },
    width: box.width,
    height: box.height,
    data: {
      label: box.label,
      lines: box.lines,
      note: box.note,
      accent: box.accent,
      direction,
      roomForNote,
    },
    draggable: movable,
    selectable: true,
    zIndex: 2,
  };
}

interface BoxContext {
  direction: DiagramDirection;
  roomForNote: boolean;
  movable: boolean;
}

/**
 * Indexed, because a diagram may state the same link twice — once dashed and
 * once not — and two nodes sharing an id is a drawing that loses one.
 */
function wireEdge(edge: PlacedEdge, index: number, direction: DiagramDirection): FlowEdge {
  return {
    id: `wire:${index}`,
    source: `${BOX}${edge.from}`,
    target: `${BOX}${edge.to}`,
    type: "wire",
    data: {
      points: edge.points,
      dashed: edge.style === "dashed",
      head: edge.head,
      label: edge.label,
      direction,
      index,
    },
    zIndex: 1,
  };
}

/** The node a dragged box stands for, or null when the library moved something else. */
export function boxIdOf(flowId: string): string | null {
  return flowId.startsWith(BOX) ? flowId.slice(BOX.length) : null;
}

/** The group a band stands for, or null when the id names something else. */
export function groupIdOf(flowId: string): string | null {
  return flowId.startsWith(BAND) ? flowId.slice(BAND.length) : null;
}
