import type { DiagramEdge, DiagramGroup, DiagramNode } from "../diagram";
import { groupOrder } from "../group-tree";

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
  // Depth first over the tree, so a group's members sit beside the members of
  // the groups inside it rather than beside a stranger from another branch. A
  // group only the nodes mention still gets a place: ordering is a tidiness
  // rule, and it may not stop working because a declaration is missing.
  const order = groupOrder(groups);
  for (const node of nodes) {
    const id = node.group ?? "";
    if (!order.has(id)) order.set(id, order.size);
  }

  const ordered = ranks.map((rank) => [...rank]);
  for (let r = 1; r < ordered.length; r++) {
    const above = new Map(ordered[r - 1].map((id, i) => [id, i]));
    ordered[r] = stableSortBy(ordered[r], (id, i) => medianOfParents(id, forward, above) ?? i);
  }
  return ordered.map((rank) =>
    stableSortBy(rank, (id) => order.get(groupOf.get(id) ?? "") ?? -1),
  );
}

function medianOfParents(
  id: string,
  forward: DiagramEdge[],
  above: Map<string, number>,
): number | null {
  const positions = forward
    .filter((e) => e.to === id && above.has(e.from))
    .map((e) => above.get(e.from) as number)
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
