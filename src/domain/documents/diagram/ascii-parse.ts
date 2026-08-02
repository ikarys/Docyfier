import type { DiagramEdge, DiagramGroup, DiagramNode } from "./diagram";
import { findBoxes, ownTextLines, type Box } from "./ascii-boxes";
import { findHorizontalEdges, findVerticalEdges } from "./ascii-arrows";

/**
 * A diagram's structure, read from a box-drawing text block (PLAN.md
 * STEP 10) — or null when the text does not confidently read as one.
 *
 * A model asked to both read a drawing and decide its style in one call
 * dropped the nesting on a real, deep example (the reported ascii-diagram
 * bug): the structure this returns is exactly what a model no longer has to
 * infer. `passage/route.ts` hands it over already built and asks the model
 * only for `kind`, `direction`, and per-node `accent`/`icon` on top.
 */
export interface ParsedSkeleton {
  nodes: Pick<DiagramNode, "id" | "label" | "note" | "group">[];
  groups: DiagramGroup[];
  edges: Pick<DiagramEdge, "from" | "to" | "label" | "style" | "head">[];
}

function slugger(): (label: string) => string {
  const used = new Set<string>();
  return (label: string) => {
    const base =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "box";
    let id = base;
    let n = 2;
    while (used.has(id)) id = `${base}-${n++}`;
    used.add(id);
    return id;
  };
}

function depthOf(box: Box): number {
  let depth = 0;
  for (let at = box.parent; at; at = at.parent) depth++;
  return depth;
}

/**
 * One box's place in the skeleton: a leaf becomes a node; a box with
 * children becomes a group, and any text it carries beyond its own heading
 * becomes a plain member node — a group has no "note" to hold it, and a box
 * with no border of its own becomes exactly that everywhere else here.
 */
function assembleBox(
  box: Box,
  text: readonly string[],
  slug: (label: string) => string,
  idOf: Map<Box, string>,
  nodes: ParsedSkeleton["nodes"],
  groups: DiagramGroup[],
): void {
  const parentId = box.parent ? idOf.get(box.parent) : undefined;
  const id = slug(text[0]);
  idOf.set(box, id);

  if (box.children.length === 0) {
    nodes.push({
      id,
      label: text[0],
      ...(text.length > 1 ? { note: text.slice(1).join("; ") } : {}),
      ...(parentId ? { group: parentId } : {}),
    });
    return;
  }

  groups.push({ id, label: text[0], ...(parentId ? { parent: parentId } : {}) });
  if (text.length > 1) {
    nodes.push({
      id: slug(text[1]),
      label: text[1],
      ...(text.length > 2 ? { note: text.slice(2).join("; ") } : {}),
      group: id,
    });
  }
}

export function parseAsciiDiagram(source: string): ParsedSkeleton | null {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const boxes = findBoxes(lines);
  if (boxes === null || boxes.length === 0) return null;

  const slug = slugger();
  const idOf = new Map<Box, string>();
  const nodes: ParsedSkeleton["nodes"] = [];
  const groups: DiagramGroup[] = [];

  for (const box of [...boxes].sort((a, b) => depthOf(a) - depthOf(b))) {
    const text = ownTextLines(lines, box);
    if (text.length === 0) return null;
    assembleBox(box, text, slug, idOf, nodes, groups);
  }

  const edges = [...findVerticalEdges(lines, boxes), ...findHorizontalEdges(lines, boxes)].map(
    (edge) => ({
      from: idOf.get(edge.from) as string,
      to: idOf.get(edge.to) as string,
      label: null,
      style: "solid" as const,
      head: "arrow" as const,
    }),
  );

  return { nodes, groups, edges };
}
