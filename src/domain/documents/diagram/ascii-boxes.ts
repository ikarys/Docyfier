/**
 * Box-drawing rectangles, read from plain text (PLAN.md STEP 10).
 *
 * A hand-drawn diagram keeps a box's own walls in one column for its whole
 * body, but two boxes side by side rarely close on the same row — a
 * shorter neighbour's border can share a text row with a taller one's own
 * last line. Classifying a whole row as "border" or "content" breaks on
 * exactly that drawing, so each box is found on its own instead: its walls
 * are columns tracked with a little play, never a row read as a whole.
 */

const TOP_LEFT = new Set(["┌", "+"]);
const TOP_RIGHT = new Set(["┐", "+"]);
const BOTTOM_LEFT = new Set(["└", "+"]);
const BOTTOM_RIGHT = new Set(["┘", "+"]);
const HORIZONTAL = new Set(["─", "-", "┬", "┴", "┼", "┤", "├"]);
const VERTICAL = new Set(["│", "|"]);

/**
 * How many columns a wall may drift between the row that opens or closes a
 * box and the rows of its own body. Measured against a real drawing: a
 * corner and the wall directly below it can land one column apart.
 */
const TOLERANCE = 2;

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  parent: Box | null;
  children: Box[];
}

type Span = readonly [left: number, right: number];

function findSpans(line: string, leftSet: Set<string>, rightSet: Set<string>): Span[] {
  const spans: Span[] = [];
  let i = 0;
  while (i < line.length) {
    if (leftSet.has(line[i])) {
      let j = i + 1;
      while (j < line.length && HORIZONTAL.has(line[j])) j++;
      if (j < line.length && rightSet.has(line[j]) && j > i) {
        spans.push([i, j]);
        i = j + 1;
        continue;
      }
    }
    i++;
  }
  return spans;
}

function nearestVertical(line: string, approxCol: number): number | null {
  let best: number | null = null;
  for (let c = Math.max(0, approxCol - TOLERANCE); c <= approxCol + TOLERANCE; c++) {
    if (VERTICAL.has(line[c])) {
      if (best === null || Math.abs(c - approxCol) < Math.abs(best - approxCol)) best = c;
    }
  }
  return best;
}

function closesNear(line: string, approxLeft: number, approxRight: number): boolean {
  return findSpans(line, BOTTOM_LEFT, BOTTOM_RIGHT).some(
    ([left, right]) =>
      Math.abs(left - approxLeft) <= TOLERANCE && Math.abs(right - approxRight) <= TOLERANCE,
  );
}

function area(box: Box): number {
  return (box.bottom - box.top) * (box.right - box.left);
}

function encloses(outer: Box, inner: Box): boolean {
  return (
    outer !== inner &&
    outer.top <= inner.top &&
    outer.bottom >= inner.bottom &&
    outer.left <= inner.left &&
    outer.right >= inner.right
  );
}

function tightestEnclosing(boxes: readonly Box[], box: Box): Box | null {
  let best: Box | null = null;
  for (const candidate of boxes) {
    if (encloses(candidate, box) && (!best || area(candidate) < area(best))) best = candidate;
  }
  return best;
}

/** One box's own closing row, searching downward from the row after it opened. */
function findOneBox(lines: readonly string[], row: number, span: Span): Box | null {
  const [tl, tr] = span;
  const firstBody = lines[row + 1] ?? "";
  const left = nearestVertical(firstBody, tl) ?? tl;
  const right = nearestVertical(firstBody, tr) ?? tr;

  for (let r = row + 1; r < lines.length; r++) {
    if (closesNear(lines[r], left, right)) {
      return { top: row, bottom: r, left, right, parent: null, children: [] };
    }
    const hasLeft = nearestVertical(lines[r], left) !== null;
    const hasRight = nearestVertical(lines[r], right) !== null;
    if (!hasLeft && !hasRight) break; // walls vanished without closing
  }
  return null;
}

/**
 * Every box in the drawing, linked into its containment tree — or null the
 * moment one opens and never finds its own closing row: an unmatched border
 * is not a drawing this function can trust the rest of.
 */
export function findBoxes(lines: readonly string[]): Box[] | null {
  const boxes: Box[] = [];
  const claimed = new Set<string>();

  for (let row = 0; row < lines.length; row++) {
    for (const span of findSpans(lines[row], TOP_LEFT, TOP_RIGHT)) {
      const key = `${row}:${span[0]}`;
      if (claimed.has(key)) continue;
      claimed.add(key);
      const box = findOneBox(lines, row, span);
      if (!box) return null;
      boxes.push(box);
    }
  }

  for (const box of boxes) box.parent = tightestEnclosing(boxes, box);
  for (const box of boxes) box.parent?.children.push(box);
  return boxes;
}

/**
 * A box's own text: its first line is a label, the rest is a note. A row a
 * child box already owns is skipped, which is what keeps a group's heading
 * from swallowing what its children already say. The trailing strip absorbs
 * a neighbour's wall bleeding into the slice by a column of drift — cosmetic
 * cleanup, not a claim that the column math above is exact.
 */
export function ownTextLines(lines: readonly string[], box: Box): string[] {
  const out: string[] = [];
  for (let row = box.top + 1; row < box.bottom; row++) {
    if (box.children.some((child) => row >= child.top && row <= child.bottom)) continue;
    const line = lines[row] ?? "";
    const rightEdge = nearestVertical(line, box.right) ?? box.right;
    const text = line
      .slice(box.left + 1, rightEdge)
      .trim()
      .replace(/[\s│|┌┐└┘─\-┬┴┼┤├]+$/, "");
    if (text !== "") out.push(text);
  }
  return out;
}
