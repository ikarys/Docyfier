import type { DocumentNode } from "@/domain/documents/body";

/**
 * Which top-level blocks an AI edit touched (PLAN.md STEP U4).
 *
 * Compared by value on the already-plain JSON: ProseMirror is deterministic
 * about key order in `toJSON()`, so a stringified block is a sound identity for
 * "did this survive untouched".
 */

export type BlockMark = "same" | "changed" | "inserted";

const key = (block: DocumentNode): string => JSON.stringify(block);

/**
 * Longest common subsequence of two block-key lists, as [beforeIndex,
 * afterIndex] pairs. Documents hold tens of top-level blocks, so the quadratic
 * table is free and beats a heuristic that mislabels a single insertion as
 * "everything below changed".
 */
function commonPairs(a: string[], b: string[]): [number, number][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return pairs;
}

/**
 * One mark per top-level block of `after`. Blocks matched in `before` are
 * "same"; an unmatched block is "changed" when it stands where an unmatched
 * `before` block stood, and "inserted" when it is extra.
 */
export function changedBlocks(
  before: DocumentNode,
  after: DocumentNode,
): BlockMark[] {
  const a = (before.content ?? []).map(key);
  const b = (after.content ?? []).map(key);
  const marks: BlockMark[] = new Array(b.length).fill("inserted");

  let ai = 0;
  let bi = 0;
  // The sentinel closes the trailing run after the last matched pair.
  for (const [i, j] of [...commonPairs(a, b), [a.length, b.length]]) {
    const replaced = i - ai;
    for (let p = bi; p < j; p++) {
      marks[p] = p - bi < replaced ? "changed" : "inserted";
    }
    if (j < b.length) marks[j] = "same";
    ai = i + 1;
    bi = j + 1;
  }
  return marks;
}
