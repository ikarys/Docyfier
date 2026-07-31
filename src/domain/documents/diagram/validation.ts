import {
  ACCENT_SLOTS,
  DIAGRAM_DIRECTIONS,
  DIAGRAM_KINDS,
  EDGE_HEADS,
  EDGE_STYLES,
  MAX_EDGES,
  MAX_LABEL,
  MAX_NODES,
  MAX_NOTE,
  type DiagramAttrs,
  type DiagramDirection,
  type DiagramEdge,
  type DiagramGroup,
  type DiagramKind,
  type DiagramNode,
  type EdgeHead,
  type EdgeStyle,
} from "./diagram";
import { groupTreeError } from "./group-tree";

/**
 * Describe why `value` is not a drawable diagram, or null when it is.
 *
 * Returns a message rather than throwing, for the same reason `chartError`
 * does: one function serves the node view placeholder, the editing panel and
 * the AI retry loop, and each message names the offending node or edge so the
 * model can fix it rather than guess.
 */
export function diagramError(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "diagram attrs missing";
  const a = value as Partial<DiagramAttrs>;

  if (!DIAGRAM_KINDS.includes(a.kind as DiagramKind)) {
    return `diagram "kind" must be one of ${DIAGRAM_KINDS.join(", ")}`;
  }
  if (!DIAGRAM_DIRECTIONS.includes(a.direction as DiagramDirection)) {
    return `diagram "direction" must be ${DIAGRAM_DIRECTIONS.join(" or ")}`;
  }
  return (
    nodesError(a.nodes) ??
    groupsError(a.groups) ??
    membershipError(a.nodes as DiagramNode[], a.groups as DiagramGroup[]) ??
    edgesError(a.edges, a.nodes as DiagramNode[]) ??
    textError("title", a.title) ??
    textError("caption", a.caption) ??
    kindError(a as DiagramAttrs)
  );
}

export function isDiagramAttrs(value: unknown): value is DiagramAttrs {
  return diagramError(value) === null;
}

function nodesError(nodes: unknown): string | null {
  if (!Array.isArray(nodes)) return 'diagram "nodes" must be an array';
  if (nodes.length < 1) return "diagram needs at least 1 node";
  if (nodes.length > MAX_NODES) {
    return `diagram holds at most ${MAX_NODES} nodes, got ${nodes.length}`;
  }
  const seen = new Set<string>();
  for (const [i, n] of nodes.entries()) {
    const problem = nodeError(n, i);
    if (problem) return problem;
    const { id } = n as DiagramNode;
    if (seen.has(id)) return `diagram node id "${id}" is used twice`;
    seen.add(id);
  }
  return null;
}

function nodeError(node: unknown, index: number): string | null {
  if (typeof node !== "object" || node === null) {
    return `diagram node #${index + 1} is not an object`;
  }
  const n = node as Partial<DiagramNode>;
  if (typeof n.id !== "string" || n.id.trim() === "") {
    return `diagram node #${index + 1} needs a non-empty string "id"`;
  }
  if (typeof n.label !== "string") return `diagram node "${n.id}" needs a string "label"`;
  if (n.label.length > MAX_LABEL) {
    return `diagram node "${n.id}" label is longer than ${MAX_LABEL} characters`;
  }
  if (n.note !== undefined && (typeof n.note !== "string" || n.note.length > MAX_NOTE)) {
    return `diagram node "${n.id}" note must be text of at most ${MAX_NOTE} characters`;
  }
  if (n.icon !== undefined && typeof n.icon !== "string") {
    return `diagram node "${n.id}" icon must be a name`;
  }
  if (n.accent !== undefined && !isAccentSlot(n.accent)) {
    return `diagram node "${n.id}" accent must be a whole number between 1 and ${ACCENT_SLOTS}`;
  }
  return null;
}

function isAccentSlot(value: unknown): boolean {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= ACCENT_SLOTS;
}

function groupsError(groups: unknown): string | null {
  if (!Array.isArray(groups)) return 'diagram "groups" must be an array';
  const seen = new Set<string>();
  for (const [i, g] of groups.entries()) {
    if (typeof g !== "object" || g === null) return `diagram group #${i + 1} is not an object`;
    const { id, label } = g as Partial<DiagramGroup>;
    if (typeof id !== "string" || id.trim() === "") {
      return `diagram group #${i + 1} needs a non-empty string "id"`;
    }
    if (typeof label !== "string") return `diagram group "${id}" needs a string "label"`;
    if (seen.has(id)) return `diagram group id "${id}" is used twice`;
    const { parent } = g as Partial<DiagramGroup>;
    if (parent !== undefined && typeof parent !== "string") {
      return `diagram group "${id}" needs a string "parent"`;
    }
    seen.add(id);
  }
  return groupTreeError(groups as DiagramGroup[]);
}

function membershipError(nodes: DiagramNode[], groups: DiagramGroup[]): string | null {
  const declared = new Set(groups.map((g) => g.id));
  for (const n of nodes) {
    if (n.group !== undefined && !declared.has(n.group)) {
      return `diagram node "${n.id}" belongs to group "${n.group}", which is not declared`;
    }
  }
  return null;
}

function edgesError(edges: unknown, nodes: DiagramNode[]): string | null {
  if (!Array.isArray(edges)) return 'diagram "edges" must be an array';
  if (edges.length > MAX_EDGES) {
    return `diagram holds at most ${MAX_EDGES} edges, got ${edges.length}`;
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const [i, e] of edges.entries()) {
    const problem = edgeError(e, i, ids);
    if (problem) return problem;
  }
  return null;
}

function edgeError(edge: unknown, index: number, ids: Set<string>): string | null {
  const at = `diagram edge #${index + 1}`;
  if (typeof edge !== "object" || edge === null) return `${at} is not an object`;
  const e = edge as Partial<DiagramEdge>;
  for (const end of [e.from, e.to]) {
    if (typeof end !== "string" || !ids.has(end)) {
      return `${at} points at "${String(end)}", which is not a declared node`;
    }
  }
  if (e.from === e.to) return `${at} starts and ends on "${e.from}"`;
  if (!EDGE_STYLES.includes(e.style as EdgeStyle)) {
    return `${at} "style" must be ${EDGE_STYLES.join(" or ")}`;
  }
  if (!EDGE_HEADS.includes(e.head as EdgeHead)) {
    return `${at} "head" must be ${EDGE_HEADS.join(" or ")}`;
  }
  return textError(`edge #${index + 1} label`, e.label);
}

function textError(field: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return `diagram "${field}" must be text or null`;
  return null;
}

/** What each kind asserts about the graph beyond it being well formed. */
function kindError(attrs: DiagramAttrs): string | null {
  if (attrs.kind === "timeline" && attrs.edges.length > 0) {
    return "diagram timeline takes no edges: its order is the order of its nodes";
  }
  if (attrs.kind === "sequence") return sequenceError(attrs);
  if (attrs.kind === "hierarchy") return hierarchyError(attrs);
  return null;
}

function sequenceError(attrs: DiagramAttrs): string | null {
  if (attrs.nodes.length < 2) {
    return `diagram sequence needs at least 2 participants, got ${attrs.nodes.length}`;
  }
  if (attrs.edges.length < 1) return "diagram sequence needs at least 1 message";
  return null;
}

/**
 * A hierarchy is a tree, and the tree layout has no way to draw anything else:
 * a second parent has no column to sit in and a cycle has no root to start from.
 * A flow, by contrast, may loop — a retry is a real step — and `layered.ts`
 * breaks the loop when it ranks.
 */
function hierarchyError(attrs: DiagramAttrs): string | null {
  const parent = new Map<string, string>();
  for (const e of attrs.edges) {
    if (parent.has(e.to)) return `diagram hierarchy node "${e.to}" has more than one parent`;
    parent.set(e.to, e.from);
  }
  for (const start of parent.keys()) {
    if (climbsIntoACycle(start, parent)) return "diagram hierarchy must not contain a cycle";
  }
  const roots = attrs.nodes.filter((n) => !parent.has(n.id));
  if (roots.length !== 1) {
    return `diagram hierarchy needs exactly one root, found ${roots.length}`;
  }
  return null;
}

function climbsIntoACycle(start: string, parent: Map<string, string>): boolean {
  const seen = new Set<string>([start]);
  let at = parent.get(start);
  while (at !== undefined) {
    if (seen.has(at)) return true;
    seen.add(at);
    at = parent.get(at);
  }
  return false;
}
