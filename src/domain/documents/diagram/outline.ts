import type { DiagramAttrs, DiagramEdge, DiagramNode } from "./diagram";

/**
 * A diagram as lines of text, for the targets that cannot take a drawing.
 *
 * Markdown, Jira and plain text all need this and they need the same thing, so
 * it is decided once here rather than three times: each renderer only chooses
 * its own bullet. What is lost is the picture; what survives is every relation
 * the diagram states — which is the part a reader can act on.
 */
export interface OutlineLine {
  text: string;
  /** How deep the line sits; only a hierarchy ever goes past zero. */
  depth: number;
}

export function outlineOf(attrs: DiagramAttrs): OutlineLine[] {
  if (attrs.kind === "timeline") return attrs.nodes.map((n) => flat(describe(n)));
  if (attrs.kind === "hierarchy") return treeLines(attrs);
  return [
    ...attrs.edges.map((e) => flat(edgeLine(e, attrs.nodes))),
    ...strandedIn(attrs).map(flat),
  ];
}

function flat(text: string): OutlineLine {
  return { text, depth: 0 };
}

function describe(node: DiagramNode): string {
  return node.note ? `${node.label} — ${node.note}` : node.label;
}

function labelOf(id: string, nodes: readonly DiagramNode[]): string {
  return nodes.find((n) => n.id === id)?.label ?? id;
}

function edgeLine(edge: DiagramEdge, nodes: readonly DiagramNode[]): string {
  const arrow = `${labelOf(edge.from, nodes)} → ${labelOf(edge.to, nodes)}`;
  return edge.label ? `${arrow} (${edge.label})` : arrow;
}

/** Boxes no arrow touches would otherwise vanish from the outline entirely. */
function strandedIn(attrs: DiagramAttrs): string[] {
  const touched = new Set(attrs.edges.flatMap((e) => [e.from, e.to]));
  return attrs.nodes.filter((n) => !touched.has(n.id)).map(describe);
}

/** Nested, because a tree's shape is the whole of what it says. */
function treeLines(attrs: DiagramAttrs): OutlineLine[] {
  const children = new Map<string, string[]>(attrs.nodes.map((n) => [n.id, []]));
  const hasParent = new Set(attrs.edges.map((e) => e.to));
  for (const edge of attrs.edges) children.get(edge.from)?.push(edge.to);

  const lines: OutlineLine[] = [];
  const walk = (id: string, depth: number): void => {
    const node = attrs.nodes.find((n) => n.id === id);
    if (!node) return;
    lines.push({ text: describe(node), depth });
    for (const child of children.get(id) ?? []) walk(child, depth + 1);
  };
  for (const node of attrs.nodes) if (!hasParent.has(node.id)) walk(node.id, 0);
  return lines;
}
