import type { DiagramEdge } from "../diagram";
import { GAP_ALONG, type PlacedBox } from "./geometry";
import { medianOfNeighbours } from "./ranking";

/**
 * Sliding the boxes along their rank so the lines between them run straight.
 *
 * Ranking says which row a box is on and ordering says who its neighbours are;
 * neither says where along the row it sits. Evenly spaced and centred is the
 * honest first answer and it zigzags: a chain of eight steps through ranks of
 * two, three and one box wanders left and right for no reason a reader can see.
 *
 * Each rank is solved against the one before it: every box wants to sit at the
 * middle of what it is tied to, and the row has to stay in order with its boxes
 * apart. That is a smallest-total-distance fit under an ordering constraint,
 * which has an exact answer — so this is not a heuristic that might make things
 * worse, and there is nothing to measure afterwards.
 */

/** Down then up a few times: each rank is solved against a settled neighbour. */
const PASSES = 4;

/**
 * Slide every box along its rank towards the boxes it is tied to.
 *
 * Ranks are solved one at a time against the rank already settled beside them,
 * down and then up, because a box tied on both sides cannot be given both in
 * one look. The across-axis is never touched: which rank a box is on was
 * decided by the ranking, and nothing here may second-guess it.
 */
export function straightenAlong(
  boxes: PlacedBox[],
  ranks: string[][],
  edges: readonly DiagramEdge[],
  axis: "down" | "right",
): PlacedBox[] {
  const at = new Map(boxes.map((box) => [box.id, { ...box }]));
  const half = (box: PlacedBox): number => (axis === "down" ? box.width : box.height) / 2;
  const centre = (id: string): number => {
    const box = at.get(id) as PlacedBox;
    return (axis === "down" ? box.x : box.y) + half(box);
  };

  for (let pass = 0; pass < PASSES; pass++) {
    const downward = pass % 2 === 0;
    const steps = ranks.map((_, r) => r).slice(1);
    for (const r of downward ? steps : [...steps].reverse().map((s) => s - 1)) {
      const fixed = new Map(ranks[downward ? r - 1 : r + 1].map((id) => [id, centre(id)]));
      const slots = ranks[r].map((id) => ({
        want: medianOfNeighbours(id, edges, fixed, downward) ?? centre(id),
        half: half(at.get(id) as PlacedBox),
      }));
      settle(slots, GAP_ALONG).forEach((middle, i) => {
        const box = at.get(ranks[r][i]) as PlacedBox;
        if (axis === "down") box.x = middle - box.width / 2;
        else box.y = middle - box.height / 2;
      });
    }
  }
  return boxes.map((box) => at.get(box.id) as PlacedBox);
}

/** A box on a rank: where it wants to be, and how wide it is along the rank. */
export interface Slot {
  /** The middle of the neighbours it is tied to, or its own place if it is tied to none. */
  readonly want: number;
  /** Half its length along the rank, which is what sets the distance to its neighbour. */
  readonly half: number;
}

/**
 * Where each box lands: as close to what it is tied to as the row allows.
 *
 * The gap is the least room to leave between two boxes. Order is never changed
 * — that decision was made by the ordering pass and a band drawn around a group
 * depends on it.
 */
export function settle(slots: Slot[], gap: number): number[] {
  if (slots.length === 0) return [];
  // With the minimum distances taken out, "in order and far enough apart"
  // becomes plain "non-decreasing", which is the shape the fit below solves.
  const offsets = runningOffsets(slots, gap);
  const fitted = nonDecreasingFit(slots.map((slot, i) => slot.want - offsets[i]));
  return fitted.map((value, i) => value + offsets[i]);
}

function runningOffsets(slots: Slot[], gap: number): number[] {
  const offsets = [0];
  for (let i = 1; i < slots.length; i++) {
    offsets.push(offsets[i - 1] + slots[i - 1].half + gap + slots[i].half);
  }
  return offsets;
}

/**
 * The non-decreasing sequence closest to `wanted`, distance counted as the sum
 * of the moves — pool adjacent violators, where a pool's answer is its median.
 *
 * The median rather than the mean because the cost is the sum of the moves: one
 * box tied to something far away should not drag the whole pool with it.
 */
function nonDecreasingFit(wanted: number[]): number[] {
  const pools: number[][] = [];
  for (const value of wanted) {
    pools.push([value]);
    while (pools.length > 1 && median(pools[pools.length - 2]) > median(pools[pools.length - 1])) {
      const last = pools.pop() as number[];
      (pools[pools.length - 1] as number[]).push(...last);
    }
  }
  return pools.flatMap((pool) => pool.map(() => median(pool)));
}

/**
 * The middle of `values` — and for an even count, the middle of the two middle
 * ones. Every point between them costs the same, so the choice is free; taking
 * the centre is what makes two boxes wanting one place sit either side of it
 * rather than both to its left.
 */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
