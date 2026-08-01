import type {
  DiagramAttrs,
  DiagramEdge,
  DiagramKind,
  DiagramNode,
  EdgeStyle,
} from "./diagram";
import { diagramError } from "./validation";

/**
 * Every edit the diagram panel can make, as a whole new set of attributes.
 *
 * The rule that keeps a diagram drawable is stated once: an edit whose result
 * `diagramError` rejects is not made, and the caller gets the diagram back
 * unchanged. No edit restates an invariant of its own, and the panel has
 * nothing to check before calling one.
 */
function kept(before: DiagramAttrs, after: DiagramAttrs): DiagramAttrs {
  return diagramError(after) === null ? after : before;
}

function mapNode(
  attrs: DiagramAttrs,
  id: string,
  change: (node: DiagramNode) => DiagramNode,
): DiagramAttrs {
  return kept(attrs, {
    ...attrs,
    nodes: attrs.nodes.map((n) => (n.id === id ? change(n) : n)),
  });
}

export function renameNode(attrs: DiagramAttrs, id: string, label: string): DiagramAttrs {
  return mapNode(attrs, id, (n) => ({ ...n, label }));
}

/** A group nobody declared cannot be renamed: the band drawn for it is a stray. */
export function renameGroup(attrs: DiagramAttrs, id: string, label: string): DiagramAttrs {
  if (!attrs.groups.some((g) => g.id === id)) return attrs;
  return kept(attrs, {
    ...attrs,
    groups: attrs.groups.map((g) => (g.id === id ? { ...g, label } : g)),
  });
}

/**
 * An empty note is no note: the second line disappears rather than going blank.
 * The same holds for a colour and a group — an absent option is dropped from
 * the node instead of being stored as an empty one.
 */
export function setNote(attrs: DiagramAttrs, id: string, note: string): DiagramAttrs {
  return mapNode(attrs, id, (n) =>
    note.trim() === "" ? without(n, "note") : { ...n, note },
  );
}

export function setAccent(attrs: DiagramAttrs, id: string, accent: number | null): DiagramAttrs {
  return mapNode(attrs, id, (n) =>
    accent === null ? without(n, "accent") : { ...n, accent },
  );
}

/**
 * Remember where a hand dropped a box.
 *
 * The drawing starts at its own edge, so a box dropped past it is kept on the
 * paper rather than pushing the whole picture sideways. Anything that is not a
 * number leaves the diagram alone, like every other edit here.
 */
export function moveNode(attrs: DiagramAttrs, id: string, x: number, y: number): DiagramAttrs {
  return mapNode(attrs, id, (n) => ({ ...n, x: Math.max(0, x), y: Math.max(0, y) }));
}

/** Hand every box back to the layout — the way out of a drawing pulled into a mess. */
export function realign(attrs: DiagramAttrs): DiagramAttrs {
  return kept(attrs, {
    ...attrs,
    nodes: attrs.nodes.map((n) => without(without(n, "x"), "y")),
  });
}

export function moveToGroup(attrs: DiagramAttrs, id: string, group: string | null): DiagramAttrs {
  return mapNode(attrs, id, (n) =>
    group === null ? without(n, "group") : { ...n, group },
  );
}

function without<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

/** Append a node the drawing already reaches, so an edit never leaves an island. */
export function addNode(attrs: DiagramAttrs): DiagramAttrs {
  const id = freeId(attrs.nodes);
  const node: DiagramNode = { id, label: `Item ${attrs.nodes.length + 1}` };
  const anchor = attrs.kind === "hierarchy" ? rootOf(attrs) : lastOf(attrs);
  const linked = attrs.kind === "timeline" || anchor === null ? [] : [link(anchor, id)];
  return kept(attrs, { ...attrs, nodes: [...attrs.nodes, node], edges: [...attrs.edges, ...linked] });
}

/**
 * Remove a node and mend what ran through it: what led to it now leads to what
 * it led to. Deleting a step in the middle of a flow should shorten the flow,
 * not cut it in two.
 */
export function removeNode(attrs: DiagramAttrs, id: string): DiagramAttrs {
  const parents = attrs.edges.filter((e) => e.to === id).map((e) => e.from);
  const children = attrs.edges.filter((e) => e.from === id).map((e) => e.to);
  const bridged = parents.flatMap((from) =>
    children.filter((to) => to !== from).map((to) => link(from, to)),
  );
  const edges = attrs.edges.filter((e) => e.from !== id && e.to !== id);
  return kept(attrs, {
    ...attrs,
    nodes: attrs.nodes.filter((n) => n.id !== id),
    edges: [...edges, ...bridged.filter((b) => !edges.some(sameEnds(b)))],
  });
}

export function addEdge(attrs: DiagramAttrs, from: string, to: string): DiagramAttrs {
  return kept(attrs, { ...attrs, edges: [...attrs.edges, link(from, to)] });
}

export function removeEdge(attrs: DiagramAttrs, index: number): DiagramAttrs {
  return kept(attrs, { ...attrs, edges: attrs.edges.filter((_, i) => i !== index) });
}

export function setEdgeLabel(attrs: DiagramAttrs, index: number, label: string): DiagramAttrs {
  return mapEdge(attrs, index, (e) => ({ ...e, label: label.trim() === "" ? null : label }));
}

export function setEdgeStyle(attrs: DiagramAttrs, index: number, style: EdgeStyle): DiagramAttrs {
  return mapEdge(attrs, index, (e) => ({ ...e, style }));
}

function mapEdge(
  attrs: DiagramAttrs,
  index: number,
  change: (edge: DiagramEdge) => DiagramEdge,
): DiagramAttrs {
  return kept(attrs, {
    ...attrs,
    edges: attrs.edges.map((e, i) => (i === index ? change(e) : e)),
  });
}

export function flipDirection(attrs: DiagramAttrs): DiagramAttrs {
  return kept(attrs, { ...attrs, direction: attrs.direction === "down" ? "right" : "down" });
}

export function setTitle(attrs: DiagramAttrs, title: string): DiagramAttrs {
  return kept(attrs, { ...attrs, title: title.trim() === "" ? null : title });
}

export function setCaption(attrs: DiagramAttrs, caption: string): DiagramAttrs {
  return kept(attrs, { ...attrs, caption: caption.trim() === "" ? null : caption });
}

/**
 * Change what the diagram is, adapting the graph rather than refusing.
 *
 * A timeline cannot keep edges and a hierarchy cannot keep a second parent, so
 * those are dropped here. Refusing instead would leave someone who picked the
 * wrong kind with no way out but deleting the block.
 */
export function setKind(attrs: DiagramAttrs, kind: DiagramKind): DiagramAttrs {
  if (kind === "timeline") return kept(attrs, { ...attrs, kind, edges: [] });
  if (kind === "hierarchy") return kept(attrs, { ...attrs, kind, edges: spanningTree(attrs.edges) });
  return kept(attrs, { ...attrs, kind });
}

/** The first edge that claims each node, which is a tree whenever one exists. */
function spanningTree(edges: DiagramEdge[]): DiagramEdge[] {
  const claimed = new Set<string>();
  return edges.filter((e) => {
    if (claimed.has(e.to)) return false;
    claimed.add(e.to);
    return true;
  });
}

function link(from: string, to: string): DiagramEdge {
  return { from, to, label: null, style: "solid", head: "arrow" };
}

function sameEnds(edge: DiagramEdge): (other: DiagramEdge) => boolean {
  return (other) => other.from === edge.from && other.to === edge.to;
}

function freeId(nodes: DiagramNode[]): string {
  const taken = new Set(nodes.map((n) => n.id));
  for (let i = nodes.length + 1; ; i++) {
    const id = `n${i}`;
    if (!taken.has(id)) return id;
  }
}

function rootOf(attrs: DiagramAttrs): string | null {
  const children = new Set(attrs.edges.map((e) => e.to));
  return attrs.nodes.find((n) => !children.has(n.id))?.id ?? null;
}

function lastOf(attrs: DiagramAttrs): string | null {
  return attrs.nodes[attrs.nodes.length - 1]?.id ?? null;
}
