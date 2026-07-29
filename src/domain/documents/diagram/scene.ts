import {
  BOX_PAD_X,
  BOX_PAD_Y,
  GROUP_HEADER,
  LABEL_SIZE,
  LINE_HEIGHT,
  NOTE_HEIGHT,
  NOTE_SIZE,
  textWidth,
  type Placement,
  type PlacedBox,
  type PlacedEdge,
  type PlacedGroup,
  type Point,
  type Rail,
} from "./layout/geometry";

/**
 * A placed diagram as drawing primitives, with colours named rather than valued.
 *
 * The editor and the export path must draw the same picture, but they cannot
 * name colours the same way: the browser reads theme tokens live, while the
 * SVG that gets rasterised for Word or Confluence must carry literal values —
 * librsvg resolves no CSS variable. The scene is the shared half; each emitter
 * supplies the other.
 */

export type Ink =
  | "surface"
  | "border"
  | "line"
  | "text"
  | "muted"
  | "band"
  | "band-border"
  | "accent-1"
  | "accent-2"
  | "accent-3"
  | "accent-4";

export interface RectShape {
  shape: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: Ink | null;
  stroke: Ink | null;
  dashed: boolean;
}

export interface PathShape {
  shape: "path";
  d: string;
  stroke: Ink | null;
  fill: Ink | null;
  width: number;
  dashed: boolean;
}

export interface TextShape {
  shape: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  bold: boolean;
  anchor: "start" | "middle" | "end";
  fill: Ink;
}

export type Shape = RectShape | PathShape | TextShape;

export interface Scene {
  width: number;
  height: number;
  /** Painted in order: bands, then rails and edges, then boxes on top. */
  shapes: Shape[];
}

const ARROW_LENGTH = 9;
const ARROW_HALF = 4.5;
const BOX_RADIUS = 10;
const ACCENT_BAR = 3;
/** Text sits on its baseline; SVG's own baseline controls are unreliable in librsvg. */
const BASELINE = 0.78;

export function toScene(placement: Placement): Scene {
  return {
    width: placement.width,
    height: placement.height,
    shapes: [
      ...placement.groups.flatMap(band),
      ...placement.rails.map(rail),
      ...placement.edges.flatMap(edge),
      ...placement.boxes.flatMap(box),
    ],
  };
}

function band(group: PlacedGroup): Shape[] {
  return [
    {
      shape: "rect",
      x: group.x,
      y: group.y,
      width: group.width,
      height: group.height,
      radius: BOX_RADIUS + 4,
      fill: "band",
      stroke: "band-border",
      dashed: true,
    },
    {
      shape: "text",
      x: group.x + BOX_PAD_X,
      y: group.y - GROUP_HEADER + NOTE_SIZE * BASELINE,
      text: group.label,
      size: NOTE_SIZE,
      bold: true,
      anchor: "start",
      fill: "muted",
    },
  ];
}

function rail(rail: Rail): Shape {
  return {
    shape: "path",
    d: `M ${rail.from.x} ${rail.from.y} L ${rail.to.x} ${rail.to.y}`,
    stroke: rail.kind === "lifeline" ? "border" : "line",
    fill: null,
    width: rail.kind === "axis" ? 2 : 1,
    dashed: rail.kind === "lifeline",
  };
}

function edge(edge: PlacedEdge): Shape[] {
  const shapes: Shape[] = [
    {
      shape: "path",
      d: polyline(edge.points),
      stroke: "line",
      fill: null,
      width: 1.5,
      dashed: edge.style === "dashed",
    },
  ];
  if (edge.head === "arrow") shapes.push(arrowhead(edge.points));
  if (edge.label && edge.labelAt) shapes.push(...edgeLabel(edge.label, edge.labelAt));
  return shapes;
}

function polyline(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

/** A filled triangle rather than an SVG marker: markers inherit colour poorly. */
function arrowhead(points: Point[]): PathShape {
  const tip = points[points.length - 1];
  const before = points[points.length - 2];
  const length = Math.hypot(tip.x - before.x, tip.y - before.y) || 1;
  const ux = (tip.x - before.x) / length;
  const uy = (tip.y - before.y) / length;
  const baseX = tip.x - ux * ARROW_LENGTH;
  const baseY = tip.y - uy * ARROW_LENGTH;
  return {
    shape: "path",
    d:
      `M ${tip.x} ${tip.y} ` +
      `L ${baseX - uy * ARROW_HALF} ${baseY + ux * ARROW_HALF} ` +
      `L ${baseX + uy * ARROW_HALF} ${baseY - ux * ARROW_HALF} Z`,
    stroke: null,
    fill: "line",
    width: 0,
    dashed: false,
  };
}

/** The label gets a plate of its own, so the line does not run through the text. */
function edgeLabel(label: string, at: Point): Shape[] {
  const width = textWidth(label, NOTE_SIZE) + 10;
  return [
    {
      shape: "rect",
      x: at.x - width / 2,
      y: at.y - NOTE_HEIGHT / 2 - 2,
      width,
      height: NOTE_HEIGHT + 2,
      radius: 4,
      fill: "surface",
      stroke: null,
      dashed: false,
    },
    {
      shape: "text",
      x: at.x,
      y: at.y + NOTE_SIZE * BASELINE - NOTE_SIZE / 2,
      text: label,
      size: NOTE_SIZE,
      bold: false,
      anchor: "middle",
      fill: "muted",
    },
  ];
}

function box(box: PlacedBox): Shape[] {
  const shapes: Shape[] = [
    {
      shape: "rect",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      radius: BOX_RADIUS,
      fill: "surface",
      stroke: "border",
      dashed: false,
    },
  ];
  if (box.accent) shapes.push(accentBar(box, `accent-${box.accent}` as Ink));
  return [...shapes, ...boxText(box)];
}

/**
 * The accent is a bar across the top of the card, not the card's outline: an
 * outline in a second colour competes with the border of every other box, and
 * a bar reads at a glance even in print.
 *
 * It is inset past the corner radius so its flat ends never poke out of the
 * curve — the one place where drawing a rectangle over a rounded one shows.
 */
function accentBar(box: PlacedBox, accent: Ink): RectShape {
  const inset = BOX_RADIUS * 1.4;
  return {
    shape: "rect",
    x: box.x + inset,
    y: box.y + 1.5,
    width: box.width - inset * 2,
    height: ACCENT_BAR,
    radius: ACCENT_BAR / 2,
    fill: accent,
    stroke: null,
    dashed: false,
  };
}

function boxText(box: PlacedBox): TextShape[] {
  const centre = box.x + box.width / 2;
  const lines: TextShape[] = box.lines.map((text, i) => ({
    shape: "text",
    x: centre,
    y: box.y + BOX_PAD_Y + i * LINE_HEIGHT + LABEL_SIZE * BASELINE,
    text,
    size: LABEL_SIZE,
    bold: true,
    anchor: "middle",
    fill: "text",
  }));
  if (!box.note) return lines;
  return [
    ...lines,
    {
      shape: "text",
      x: centre,
      y: box.y + BOX_PAD_Y + box.lines.length * LINE_HEIGHT + NOTE_SIZE * BASELINE,
      text: box.note,
      size: NOTE_SIZE,
      bold: false,
      anchor: "middle",
      fill: "muted",
    },
  ];
}
