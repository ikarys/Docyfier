import type { Box } from "./ascii-boxes";

/**
 * Edges read off connector characters between two already-found boxes
 * (PLAN.md STEP 10), restricted to siblings: an arrow crossing into or out
 * of a nested box would have to cross a wall this function has no business
 * reading through.
 *
 * An explicit arrowhead is required. A bare run of `│`/`─` is exactly what a
 * neighbour's own wall looks like once it drifts a column or two into the
 * gap between two unrelated boxes — drift `ascii-boxes.ts` already tolerates
 * for a box's own walls. Requiring a head is what keeps that drift from
 * being read as a relation nobody drew.
 */

const ARROW_HEAD = new Set(["v", "V", "▼", ">"]);
const CONNECTOR = new Set(["│", "|", "─", "-", "v", "V", "▼", ">", "<", "^"]);

export interface FoundEdge {
  from: Box;
  to: Box;
}

function siblingsOf(boxes: readonly Box[], box: Box): Box[] {
  return boxes.filter((other) => other !== box && other.parent === box.parent);
}

function verticalRun(lines: readonly string[], top: number, bottom: number, col: number): boolean {
  let sawHead = false;
  for (let row = top; row < bottom; row++) {
    const ch = (lines[row] ?? "")[col] ?? " ";
    if (ch === " ") continue;
    if (!CONNECTOR.has(ch)) return false;
    if (ARROW_HEAD.has(ch)) sawHead = true;
  }
  return sawHead;
}

/** One edge per box: the nearest sibling below it that a real connector reaches. */
export function findVerticalEdges(lines: readonly string[], boxes: readonly Box[]): FoundEdge[] {
  const edges: FoundEdge[] = [];
  for (const above of boxes) {
    const below = siblingsOf(boxes, above)
      .filter((box) => box.top > above.bottom)
      .sort((a, b) => a.top - b.top)
      .find((box) => {
        const left = Math.max(above.left, box.left);
        const right = Math.min(above.right, box.right);
        return (
          left <= right && verticalRun(lines, above.bottom + 1, box.top, Math.round((left + right) / 2))
        );
      });
    if (below) edges.push({ from: above, to: below });
  }
  return edges;
}

function horizontalRun(line: string, left: number, right: number): boolean {
  let sawHead = false;
  for (let col = left; col < right; col++) {
    const ch = line[col] ?? " ";
    if (ch === " ") continue;
    if (!CONNECTOR.has(ch)) return false;
    if (ARROW_HEAD.has(ch)) sawHead = true;
  }
  return sawHead;
}

/** One edge per box: the nearest sibling to its right that a real connector reaches. */
export function findHorizontalEdges(lines: readonly string[], boxes: readonly Box[]): FoundEdge[] {
  const edges: FoundEdge[] = [];
  for (const left of boxes) {
    const right = siblingsOf(boxes, left)
      .filter((box) => box.left > left.right)
      .sort((a, b) => a.left - b.left)
      .find((box) => {
        const top = Math.max(left.top, box.top);
        const bottom = Math.min(left.bottom, box.bottom);
        return (
          top <= bottom &&
          horizontalRun(lines[Math.round((top + bottom) / 2)] ?? "", left.right + 1, box.left)
        );
      });
    if (right) edges.push({ from: left, to: right });
  }
  return edges;
}
