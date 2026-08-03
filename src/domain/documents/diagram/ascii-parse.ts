import { MAX_LABEL, MAX_NODES, MAX_NOTE, type DiagramEdge, type DiagramGroup, type DiagramNode } from "./diagram";
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
 * A box's descriptive lines joined into one note, kept within `MAX_NOTE` —
 * cut at the last "; " boundary so a long drawing still parses (PLAN.md
 * STEP 10) instead of being refused outright: a note is a short annotation
 * by design, not the whole drawing reproduced verbatim.
 */
function noteFrom(lines: readonly string[]): string {
  const joined = lines.join("; ");
  if (joined.length <= MAX_NOTE) return joined;
  const cut = joined.slice(0, MAX_NOTE - 1);
  const boundary = cut.lastIndexOf("; ");
  return `${boundary > 0 ? cut.slice(0, boundary) : cut}…`;
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
      ...(text.length > 1 ? { note: noteFrom(text.slice(1)) } : {}),
      ...(parentId ? { group: parentId } : {}),
    });
    return;
  }

  groups.push({ id, label: text[0], ...(parentId ? { parent: parentId } : {}) });
  if (text.length > 1) {
    nodes.push({
      id: slug(text[1]),
      label: text[1],
      ...(text.length > 2 ? { note: noteFrom(text.slice(2)) } : {}),
      group: id,
    });
  }
}

/**
 * A skeleton the model is told to reproduce verbatim can never validate once
 * it breaks a hard limit `diagramError` itself enforces — "use these ids,
 * labels, groups and edges, invent none, drop none" contradicts "at most
 * `MAX_NODES` nodes". Refusing here is the parser's own "returns null
 * whenever the input doesn't parse with confidence": a drawing that cannot
 * possibly fit is not a confident parse of one that can. A note has no such
 * refusal — `noteFrom` keeps it within `MAX_NOTE` by construction instead,
 * since a note is the one field a drawing can lose detail from without
 * losing its structure.
 */
function exceedsSchemaLimits(nodes: ParsedSkeleton["nodes"]): boolean {
  if (nodes.length > MAX_NODES) return true;
  return nodes.some((node) => node.label.length > MAX_LABEL);
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
  if (exceedsSchemaLimits(nodes)) return null;

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
