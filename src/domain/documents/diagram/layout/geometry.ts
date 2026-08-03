import type { DiagramNode, EdgeHead, EdgeStyle } from "../diagram";

/**
 * What a placed diagram is made of, and the metrics every layout measures with.
 *
 * Coordinates are user-space units of a single `viewBox`, the way `ChartPlot`
 * fixes its own W/H: the drawing scales with the column it lands in, so nothing
 * here needs to know the width of a page, a screen or a Word document.
 */

export interface Point {
  x: number;
  y: number;
}

export interface PlacedBox extends Point {
  id: string;
  width: number;
  height: number;
  /**
   * The label as it was written, beside the lines it was broken into: a surface
   * that lets someone rewrite it needs the sentence, not the wrapping.
   */
  label: string;
  lines: string[];
  note: string | null;
  noteLines: string[];
  icon: string | null;
  accent: number | null;
}

export interface PlacedGroup extends Point {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface PlacedEdge {
  from: string;
  to: string;
  label: string | null;
  style: EdgeStyle;
  head: EdgeHead;
  /** Orthogonal polyline, at least two points, drawn in order. */
  points: Point[];
  labelAt: Point | null;
}

/** A lifeline under a sequence participant, or the axis of a timeline. */
export interface Rail {
  kind: "lifeline" | "axis" | "tick";
  from: Point;
  to: Point;
}

export interface Placement {
  width: number;
  height: number;
  boxes: PlacedBox[];
  groups: PlacedGroup[];
  edges: PlacedEdge[];
  rails: Rail[];
}

export const LABEL_SIZE = 14;
export const NOTE_SIZE = 11;
export const LINE_HEIGHT = 18;
export const NOTE_HEIGHT = 15;
export const BOX_PAD_X = 14;
export const BOX_PAD_Y = 12;
export const MIN_BOX_WIDTH = 116;
export const MAX_BOX_WIDTH = 208;
export const GAP_ALONG = 40;
/** The slot an edge stands in while getting past a rank it does not stop at. */
export const LANE_WIDTH = 16;
export const GAP_ACROSS = 56;
export const MARGIN = 20;
export const GROUP_PAD = 16;
export const GROUP_HEADER = 22;

/**
 * Width of `text` at `size`, without a DOM.
 *
 * A layout that measured text in the browser could not run on the server, and
 * the export path needs the same geometry the editor drew. 0.56em per character
 * is the average of the UI stack at these sizes — close enough that boxes are
 * sized generously rather than exactly.
 */
export function textWidth(text: string, size: number): number {
  return text.length * size * 0.56;
}

/** Break `label` into at most `maxLines` lines that fit `width`, ellipsing the rest. */
export function wrapLabel(label: string, width: number, maxLines = 2, size = LABEL_SIZE): string[] {
  const budget = Math.max(1, Math.floor(width / (size * 0.56)));
  const lines: string[] = [];
  let line = "";
  for (const word of label.split(/\s+/).filter(Boolean)) {
    const next = line === "" ? word : `${line} ${word}`;
    if (next.length <= budget || line === "") line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  if (lines.length === 0) return [""];
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, budget - 1)}…`;
  return kept;
}

export interface BoxSize {
  width: number;
  height: number;
}

/**
 * One size for every box in a diagram.
 *
 * Boxes of differing widths read as an accident; a single measured size reads
 * as a decision, and it is what lets the layouts place on a plain grid.
 */
export function uniformBoxSize(nodes: readonly DiagramNode[]): BoxSize {
  const widest = Math.max(
    ...nodes.map((n) =>
      Math.max(textWidth(n.label, LABEL_SIZE) / 2, textWidth(n.note ?? "", NOTE_SIZE)),
    ),
  );
  const width = clamp(Math.ceil(widest) + BOX_PAD_X * 2, MIN_BOX_WIDTH, MAX_BOX_WIDTH);
  const inner = width - BOX_PAD_X * 2;
  const lines = Math.max(...nodes.map((n) => wrapLabel(n.label, inner, LABEL_MAX_LINES).length));
  const hasNote = nodes.some((n) => noteOf(n) !== null);
  const noteLines = hasNote
    ? Math.max(...nodes.map((n) => noteWrapOf(n, inner).length))
    : 0;
  const height = BOX_PAD_Y * 2 + lines * LINE_HEIGHT + noteLines * NOTE_HEIGHT;
  return { width, height };
}

/**
 * A label is a name, not the paragraph the note carries — but a model that
 * folds a qualifier into it rather than the note (the prompt now says not to,
 * but an existing diagram was already drawn that way) still should not lose
 * it to an ellipsis. Measured the same way as `NOTE_MAX_LINES`: a real
 * offender — `"prd cluster: subscription astro_shared_prd (westeurope) —
 * SEPARATE"` — needs 5 lines at `MAX_BOX_WIDTH` to clear without one.
 */
export const LABEL_MAX_LINES = 5;

/**
 * Enough lines that a note at `MAX_NOTE`'s length wraps without ellipsis, even
 * at `MAX_BOX_WIDTH`. Word boundaries waste part of every line's budget, so
 * this is measured against real content, not `MAX_NOTE` divided by a
 * character budget: a comma-separated list of short items — the shape a
 * converted diagram's note actually takes — needs 7 lines at 160 characters.
 */
export const NOTE_MAX_LINES = 8;

/** A note that carries no text wraps to nothing: `noteOf` already made that call. */
function noteWrapOf(node: DiagramNode, innerWidth: number): string[] {
  const note = noteOf(node);
  return note === null ? [] : wrapLabel(note, innerWidth, NOTE_MAX_LINES, NOTE_SIZE);
}

/**
 * The second line a box actually carries, or nothing.
 *
 * `diagramError` accepts an empty note, so "has a note" is a judgement rather
 * than a field test — and it is made here alone. Sized one way and read back
 * another is a box offering a note line it has no height for.
 */
export function noteOf(node: DiagramNode): string | null {
  return node.note ? node.note : null;
}

export function boxFrom(node: DiagramNode, at: Point, size: BoxSize): PlacedBox {
  const inner = size.width - BOX_PAD_X * 2;
  return {
    id: node.id,
    x: at.x,
    y: at.y,
    width: size.width,
    height: size.height,
    label: node.label,
    lines: wrapLabel(node.label, inner, LABEL_MAX_LINES),
    note: noteOf(node),
    noteLines: noteWrapOf(node, inner),
    icon: node.icon ?? null,
    accent: node.accent ?? null,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Shift every placed part so the drawing starts at the margin, and size the canvas. */
export function frame(placement: Omit<Placement, "width" | "height">): Placement {
  const xs = placement.boxes.flatMap((b) => [b.x, b.x + b.width]);
  const ys = placement.boxes.flatMap((b) => [b.y, b.y + b.height]);
  for (const g of placement.groups) {
    xs.push(g.x, g.x + g.width);
    ys.push(g.y - GROUP_HEADER, g.y + g.height);
  }
  for (const e of placement.edges) for (const p of e.points) {
    xs.push(p.x);
    ys.push(p.y);
  }
  for (const r of placement.rails) {
    xs.push(r.from.x, r.to.x);
    ys.push(r.from.y, r.to.y);
  }
  const dx = MARGIN - Math.min(...xs);
  const dy = MARGIN - Math.min(...ys);
  const shifted = translate(placement, dx, dy);
  return { ...shifted, ...canvasSize(shifted) };
}

/**
 * A canvas wide and tall enough for everything in it, with the margin kept.
 *
 * Read off the drawing rather than off the layout's own grid, so a box someone
 * dragged past the edge grows the picture instead of hanging outside it.
 */
export function canvasSize(placement: Omit<Placement, "width" | "height">): {
  width: number;
  height: number;
} {
  const xs = [
    ...placement.boxes.map((b) => b.x + b.width),
    ...placement.groups.map((g) => g.x + g.width),
    ...placement.edges.flatMap((e) => e.points.map((p) => p.x)),
    ...placement.rails.flatMap((r) => [r.from.x, r.to.x]),
  ];
  const ys = [
    ...placement.boxes.map((b) => b.y + b.height),
    ...placement.groups.map((g) => g.y + g.height),
    ...placement.edges.flatMap((e) => e.points.map((p) => p.y)),
    ...placement.rails.flatMap((r) => [r.from.y, r.to.y]),
  ];
  return {
    width: Math.round(Math.max(...xs) + MARGIN),
    height: Math.round(Math.max(...ys) + MARGIN),
  };
}

function translate(
  placement: Omit<Placement, "width" | "height">,
  dx: number,
  dy: number,
): Omit<Placement, "width" | "height"> {
  const move = (p: Point): Point => ({ x: round(p.x + dx), y: round(p.y + dy) });
  return {
    boxes: placement.boxes.map((b) => ({ ...b, ...move(b) })),
    groups: placement.groups.map((g) => ({ ...g, ...move(g) })),
    edges: placement.edges.map((e) => ({
      ...e,
      points: e.points.map(move),
      labelAt: e.labelAt ? move(e.labelAt) : null,
    })),
    rails: placement.rails.map((r) => ({ ...r, from: move(r.from), to: move(r.to) })),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
