import type { DiagramEdge, DiagramGroup, DiagramNode } from "../diagram";
import { groupOrder } from "../group-tree";
import { countCrossings, transposeRanks } from "./crossings";

/**
 * Which rank each node belongs to, and in what order they sit inside it.
 *
 * Ranking is the decision that makes a flow readable: a node comes one rank
 * after the furthest thing that leads to it, so nothing ever points at a box
 * drawn beside it. Ordering is the decision that makes it look tidy — fewer
 * crossings, and a group's members kept together.
 */

/**
 * Split `edges` into the ones that go with the flow and the ones that return.
 *
 * Ranking needs a graph without cycles, and a flow is allowed to have them: a
 * retry is a real step. The edges that close a loop are taken out here and
 * routed around the drawing instead of through the ranks.
 */
export function splitBackEdges(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
): { forward: DiagramEdge[]; back: DiagramEdge[] } {
  const out = new Map<string, DiagramEdge[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) out.get(e.from)?.push(e);

  const open = new Set<string>();
  const done = new Set<string>();
  const back = new Set<DiagramEdge>();

  const walk = (id: string): void => {
    open.add(id);
    for (const e of out.get(id) ?? []) {
      if (open.has(e.to)) back.add(e);
      else if (!done.has(e.to)) walk(e.to);
    }
    open.delete(id);
    done.add(id);
  };
  for (const n of nodes) if (!done.has(n.id)) walk(n.id);

  return {
    forward: edges.filter((e) => !back.has(e)),
    back: edges.filter((e) => back.has(e)),
  };
}

/** Group node ids by rank, a node coming one past the furthest that leads to it. */
export function rankNodes(nodes: DiagramNode[], forward: DiagramEdge[]): string[][] {
  const rank = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const pending = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const out = new Map<string, DiagramEdge[]>(nodes.map((n) => [n.id, []]));
  for (const e of forward) {
    out.get(e.from)?.push(e);
    pending.set(e.to, (pending.get(e.to) ?? 0) + 1);
  }

  const queue = nodes.filter((n) => pending.get(n.id) === 0).map((n) => n.id);
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    for (const e of out.get(id) ?? []) {
      rank.set(e.to, Math.max(rank.get(e.to) ?? 0, (rank.get(id) ?? 0) + 1));
      const left = (pending.get(e.to) ?? 0) - 1;
      pending.set(e.to, left);
      if (left === 0) queue.push(e.to);
    }
  }

  const depth = Math.max(...nodes.map((n) => rank.get(n.id) ?? 0));
  const ranks: string[][] = Array.from({ length: depth + 1 }, () => []);
  for (const n of nodes) ranks[rank.get(n.id) ?? 0].push(n.id);
  return ranks;
}

/**
 * Reorder each rank: first towards the nodes that lead into it, then so that a
 * group's members end up side by side. Group contiguity wins, because a band
 * drawn around scattered boxes says something false about the system.
 */
export function orderRanks(
  ranks: string[][],
  nodes: DiagramNode[],
  forward: DiagramEdge[],
  groups: DiagramGroup[] = [],
): string[][] {
  const groupOf = new Map(nodes.map((n) => [n.id, n.group ?? ""]));
  const rank = groupRank(nodes, groups);
  const tidy = (arrangement: string[][]): string[][] =>
    arrangement.map((ids) => stableSortBy(ids, (id) => rank.get(groupOf.get(id) ?? "") ?? -1));

  let best = tidy(medianPass(ranks, forward, true));
  let fewest = countCrossings(best, forward);

  // Down then up, over and over: a median pass only ever looks at one side, so
  // a box well placed for what leads into it can be badly placed for what leads
  // out. Each arrangement is measured and only a strictly better one is kept,
  // which is what stops a heuristic pass from making a drawing worse.
  let current = best;
  for (let pass = 0; pass < SWEEPS && fewest > 0; pass++) {
    current = transposeRanks(tidy(medianPass(current, forward, pass % 2 === 1)), forward, groupOf);
    const crossings = countCrossings(current, forward);
    if (crossings >= fewest) continue;
    fewest = crossings;
    best = current.map((ids) => [...ids]);
  }
  return best;
}

/** How many down-and-up rounds to try before the drawing is as tidy as it gets. */
const SWEEPS = 8;

/**
 * Where each group sits among its siblings, depth first over the tree, so a
 * group's members sit beside the members of the groups inside it rather than
 * beside a stranger from another branch. A group only the nodes mention still
 * gets a place: ordering is a tidiness rule, and it may not stop working
 * because a declaration is missing.
 */
function groupRank(nodes: DiagramNode[], groups: DiagramGroup[]): Map<string, number> {
  const rank = groupOrder(groups);
  for (const node of nodes) {
    const id = node.group ?? "";
    if (!rank.has(id)) rank.set(id, rank.size);
  }
  return rank;
}

/** One pass over the ranks, each box moved towards the neighbours it is tied to. */
function medianPass(ranks: string[][], edges: DiagramEdge[], downward: boolean): string[][] {
  const out = ranks.map((ids) => [...ids]);
  const steps = out.map((_, r) => r).slice(1);
  for (const r of downward ? steps : [...steps].reverse().map((s) => s - 1)) {
    const fixed = new Map(out[downward ? r - 1 : r + 1].map((id, i) => [id, i]));
    out[r] = stableSortBy(out[r], (id, i) => medianOfNeighbours(id, edges, fixed, downward) ?? i);
  }
  return out;
}

/**
 * Boxes to a row, before a drawing stops fitting the text column it sits in.
 * Four of the widest box and their gaps come to just under a printed page.
 */
export const MAX_PER_ROW = 4;

/**
 * Break a rank nobody ordered into rows, one group to a row.
 *
 * An architecture states what contains what and often draws no arrow at all.
 * Ranking then has nothing to say — every box lands on rank 0 — and the result
 * is a strip as wide as the node count, illegible in a text column.
 *
 * A row never mixes two groups. A band is drawn around the box its members
 * occupy, so a row holding one member of each of three nested groups makes all
 * three bands cover each other, and the drawing says the system is something
 * it is not.
 *
 * A rank an edge touches is left whole: it was placed for a reason, and moving
 * one of its boxes down a row would put a source below what it points at.
 */
export function wrapWideRanks(
  ranks: string[][],
  edges: DiagramEdge[],
  nodes: DiagramNode[] = [],
): string[][] {
  const tied = new Set(edges.flatMap((e) => [e.from, e.to]));
  const groupOf = new Map(nodes.map((n) => [n.id, n.group ?? ""]));
  return ranks.flatMap((rank) => {
    if (rank.length <= MAX_PER_ROW || rank.some((id) => tied.has(id))) return [rank];
    return runsByGroup(rank, groupOf).flatMap(evenRows);
  });
}

/** Consecutive ids sharing a group. Ordering already put them side by side. */
function runsByGroup(rank: string[], groupOf: Map<string, string>): string[][] {
  const runs: string[][] = [];
  for (const id of rank) {
    const last = runs[runs.length - 1];
    if (last && groupOf.get(last[0]) === groupOf.get(id)) last.push(id);
    else runs.push([id]);
  }
  return runs;
}

/** As few rows as fit the ceiling, all of them the same length but the last. */
function evenRows(run: string[]): string[][] {
  const rows = Math.ceil(run.length / MAX_PER_ROW);
  const per = Math.ceil(run.length / rows);
  return Array.from({ length: rows }, (_, r) => run.slice(r * per, (r + 1) * per)).filter(
    (row) => row.length > 0,
  );
}

/**
 * Where the boxes tied to this one sit, in the rank that is currently fixed —
 * the median rather than the mean, because one far-off neighbour should not
 * drag a box away from the three it sits with.
 */
function medianOfNeighbours(
  id: string,
  edges: DiagramEdge[],
  fixed: Map<string, number>,
  downward: boolean,
): number | null {
  const positions = edges
    .filter((e) => (downward ? e.to === id : e.from === id))
    .map((e) => fixed.get(downward ? e.from : e.to))
    .filter((at): at is number => at !== undefined)
    .sort((a, b) => a - b);
  if (positions.length === 0) return null;
  return positions[Math.floor((positions.length - 1) / 2)];
}

function stableSortBy(ids: string[], key: (id: string, index: number) => number): string[] {
  return ids
    .map((id, i) => ({ id, i, key: key(id, i) }))
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((entry) => entry.id);
}
