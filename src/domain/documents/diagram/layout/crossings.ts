import type { DiagramEdge } from "../diagram";

/**
 * How many edges cross, and the cheapest way to swap a few boxes so fewer do.
 *
 * Crossings are what makes a flow unreadable, and counting them is what lets an
 * ordering be chosen rather than hoped for: a heuristic pass can make a drawing
 * worse, so every pass is measured and the best arrangement kept.
 *
 * Two edges between the same pair of ranks cross when their endpoints are in
 * opposite order — that is the whole of it, and it is why the count is over
 * pairs of edges rather than over geometry. Nothing here knows a coordinate.
 */

interface Seat {
  readonly rank: number;
  readonly index: number;
}

function seats(ranks: string[][]): Map<string, Seat> {
  const at = new Map<string, Seat>();
  ranks.forEach((rank, r) => rank.forEach((id, index) => at.set(id, { rank: r, index })));
  return at;
}

/** Pairs of edges whose endpoints sit in opposite order between two ranks. */
export function countCrossings(ranks: string[][], edges: readonly DiagramEdge[]): number {
  const at = seats(ranks);
  const spans = edges
    .map((edge) => ({ from: at.get(edge.from), to: at.get(edge.to) }))
    .filter((span): span is { from: Seat; to: Seat } => span.from !== undefined && span.to !== undefined);

  let total = 0;
  for (const [i, a] of spans.entries()) {
    for (const b of spans.slice(i + 1)) {
      if (a.from.rank !== b.from.rank || a.to.rank !== b.to.rank) continue;
      if ((a.from.index - b.from.index) * (a.to.index - b.to.index) < 0) total++;
    }
  }
  return total;
}

/**
 * Swap neighbours while it helps, over and over until nothing does.
 *
 * The median pass moves a box towards where its neighbours are, which is right
 * on average and wrong in detail: it cannot see that two particular boxes would
 * be better the other way round. Trying each adjacent pair is what picks those
 * up, and it is cheap because only the two ranks either side can change.
 *
 * Two boxes only ever swap inside one group. A band is the bounding box of its
 * members, so a swap that steps over a group boundary would make the band cover
 * a box that is not its own — a drawing that says something false to save a
 * crossing.
 */
export function transposeRanks(
  ranks: string[][],
  edges: readonly DiagramEdge[],
  groupOf: Map<string, string>,
): string[][] {
  const best = ranks.map((rank) => [...rank]);
  let improved = true;
  // Bounded so a graph the heuristic keeps finding swaps in cannot stall a
  // render; the count is only ever a tidiness gain past the first few rounds.
  for (let round = 0; improved && round < MAX_ROUNDS; round++) {
    improved = false;
    for (const rank of best) {
      for (let i = 0; i < rank.length - 1; i++) {
        if (groupOf.get(rank[i]) !== groupOf.get(rank[i + 1])) continue;
        const before = countCrossings(best, edges);
        [rank[i], rank[i + 1]] = [rank[i + 1], rank[i]];
        if (countCrossings(best, edges) < before) improved = true;
        else [rank[i], rank[i + 1]] = [rank[i + 1], rank[i]];
      }
    }
  }
  return best;
}

const MAX_ROUNDS = 4;
