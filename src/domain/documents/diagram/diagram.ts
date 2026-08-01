/**
 * The diagram model (PLAN.md STEP 10).
 *
 * A diagram is declared as meaning — nodes, edges, groups — and never as
 * coordinates: `layout/` decides where every box lands. That split is what lets
 * the AI produce a diagram it could not possibly place well by hand, and what
 * stops a user from dragging one into a mess.
 *
 * Isomorphic like `chart.ts`: the node view draws from this and
 * `src/infrastructure/editor/schema.ts` validates against it, so it stays free
 * of React and of `server-only`. This file declares the shape; `validation.ts`
 * says when a value has it and `sample.ts` supplies placeholder content.
 */

export const DIAGRAM_KINDS = [
  "flow",
  "architecture",
  "sequence",
  "hierarchy",
  "timeline",
] as const;
export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export const DIAGRAM_DIRECTIONS = ["down", "right"] as const;
export type DiagramDirection = (typeof DIAGRAM_DIRECTIONS)[number];

export const EDGE_STYLES = ["solid", "dashed"] as const;
export type EdgeStyle = (typeof EDGE_STYLES)[number];

export const EDGE_HEADS = ["arrow", "none"] as const;
export type EdgeHead = (typeof EDGE_HEADS)[number];

export interface DiagramNode {
  id: string;
  label: string;
  /** A second line under the label: a role, a technology, a duration. */
  note?: string;
  /** Icon name resolved by the renderer, which falls back when it knows none. */
  icon?: string;
  /** Palette slot 1-4, mapped to the theme's diagram colours. */
  accent?: number;
  group?: string;
  /**
   * Where a hand dropped this box, in the drawing's own units — absent for
   * every box nobody moved, which is what `layout/` still places.
   *
   * A diagram is declared as meaning and a place is not meaning: it is written
   * only by someone dragging the box, never by a model, and `realign` takes it
   * away again. That is what keeps the escape hatch open — a drawing pulled
   * into a mess is one click from the layout that knows how to place it.
   */
  x?: number;
  y?: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label: string | null;
  style: EdgeStyle;
  head: EdgeHead;
}

export interface DiagramGroup {
  id: string;
  label: string;
  /**
   * The group this one sits inside; absent at the top level.
   *
   * An architecture is nested far more often than it is flat — a subscription
   * holds a cluster, which holds an instance, which holds namespaces — and a
   * drawing that can only say "beside" comes back flatter than the thing it was
   * read from. `group-tree.ts` is where the tree those parents make is read.
   */
  parent?: string;
}

export interface DiagramAttrs {
  kind: DiagramKind;
  direction: DiagramDirection;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  groups: DiagramGroup[];
  title: string | null;
  caption: string | null;
}

export const MAX_NODES = 24;
export const MAX_EDGES = 40;
export const MAX_LABEL = 80;
export const MAX_NOTE = 160;
export const ACCENT_SLOTS = 4;

/**
 * How far groups may nest. Every level costs the drawing a band of padding on
 * all four sides, so past this the innermost boxes are a stripe.
 */
export const MAX_GROUP_DEPTH = 4;
