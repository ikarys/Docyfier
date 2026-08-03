# Diagram Conversion Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "turn into a diagram" on a box-drawing (ascii-art) block reliable without asking the user to regenerate — a deterministic parser reads the drawing's structure so the model only has to decide style, and every streamed block gets one bounded repair attempt when it fails validation instead of being silently dropped.

**Architecture:** Two independent additions. (1) `ascii-boxes.ts` finds every rectangle in a text block by tracking wall columns per-box (not per-line — real drawings have boxes of uneven height sitting side by side, which breaks whole-line border classification); `ascii-arrows.ts` reads connector characters between sibling boxes into edges, requiring an explicit arrowhead so column drift is never mistaken for a drawn relation; `ascii-parse.ts` assembles both into a `ParsedSkeleton` that `passage/route.ts` hands the model as a given, for an `into-diagram` request on parseable ascii source. (2) `read-block-stream.ts` keeps what a block failed with instead of just dropping it, and `block-stream-response.ts` fires one repair call per failure after the stream ends, using the same `TextGenerator` port and `authoringDeps()` composition already used elsewhere. A tightened `deadGroupError` in `group-tree.ts` is what makes the retry loop actually fire on this bug's exact shape (a group with no member and no child is schema-legal today).

**Tech Stack:** TypeScript, Vitest, the existing `TextGenerator`/`GenerationRequest` port (`@/domain/authoring/text-generator`), the Vercel AI SDK's `streamText` (unchanged), Next.js route handlers.

## Global Constraints

- File ≤ 250 lines, function ≤ 40 lines, cyclomatic ≤ 10 (AGENTS.md ceilings) — every new file below stays under these; split further if a task's implementation grows past them.
- No domain file imports a framework, `react`, `@tiptap/*`, `node:fs`, or an infrastructure adapter. `ascii-boxes.ts`/`ascii-arrows.ts`/`ascii-parse.ts` are pure, no I/O.
- Dependencies are injected, never fetched: the repair call takes a `TextGenerator` as a parameter: it does not import `authoringDeps` itself. Only the two route handlers (a composition boundary) call `authoringDeps()`.
- TDD: write the failing test first for every step below; a step's test must fail for the stated reason before its implementation step runs.
- Conventional Commits for every commit (`feat`, `fix`, `test`, `docs`).
- Do not touch `layout/geometry.ts`, `layout/layered.ts`, `layout/bands.ts`, `scene.ts`, or anything under `components/diagram/react-flow/` — those are mid-refactor on this branch already (see `git status`) and out of scope for this plan.

---

### Task 1: `ascii-boxes.ts` — find every box and its containment tree

**Files:**
- Create: `src/domain/documents/diagram/ascii-boxes.ts`
- Test: `src/domain/documents/diagram/ascii-boxes.test.ts`

**Interfaces:**
- Produces: `interface Box { top: number; bottom: number; left: number; right: number; parent: Box | null; children: Box[] }`; `findBoxes(lines: readonly string[]): Box[] | null`; `ownTextLines(lines: readonly string[], box: Box): string[]`. Tasks 2 and 3 import `Box`, `findBoxes`, `ownTextLines` from this file.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/documents/diagram/ascii-boxes.test.ts
import { describe, expect, it } from "vitest";
import { findBoxes, ownTextLines } from "./ascii-boxes";

const nested = [
  "┌─────────────┐",
  "│ Outer        │",
  "│ ┌─────────┐ │",
  "│ │ Inner    │ │",
  "│ └─────────┘ │",
  "└─────────────┘",
];

// A byte-for-byte excerpt of the diagram that shipped without a "parent"
// chain: three boxes closing at different rows, sharing a text row with
// each other's own last lines of content.
const unevenSiblings = [
  '┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐',
  '│  Platform KV    │   │ Managed Identity │   │  Backup ST       │',
  '│ kv-astroshddev  │   │ id-astroshddev   │   │ stastrobackupweu │',
  '│ -platform       │   │ -openbao-001     │   │ container: openbao│',
  '│ • unseal-key    │   │ (Workload Ident.)│   │ (raft snapshots) │',
  '│ • root-token    │   └──────────────────┘   └──────────────────┘',
  '│ • oidc-secret   │',
  '│ • recovery-keys │',
  '└──────────────────┘',
];

describe("findBoxes", () => {
  it("finds no boxes in plain prose", () => {
    expect(findBoxes(["Just a paragraph.", "Nothing drawn here."])).toEqual([]);
  });

  it("nests a box inside another", () => {
    const boxes = findBoxes(nested);
    expect(boxes).not.toBeNull();
    expect(boxes).toHaveLength(2);
    const [outer, inner] = boxes!;
    expect(inner.parent).toBe(outer);
    expect(outer.children).toEqual([inner]);
  });

  /**
   * A shorter neighbour's closing border can land on the same text row as a
   * taller box's own last content line. Classifying a whole row as "border"
   * breaks here; each box must be found on its own.
   */
  it("finds three boxes of uneven height side by side, losing none", () => {
    const boxes = findBoxes(unevenSiblings);
    expect(boxes).not.toBeNull();
    expect(boxes).toHaveLength(3);
    expect(boxes!.every((box) => box.parent === null)).toBe(true);
  });

  it("returns null for a box that never closes", () => {
    expect(findBoxes(["┌─────┐", "│ Oops"])).toBeNull();
  });
});

describe("ownTextLines", () => {
  it("reads a leaf box's own label and note lines", () => {
    const [outer, inner] = findBoxes(nested)!;
    expect(ownTextLines(nested, inner)).toEqual(["Inner"]);
    expect(ownTextLines(nested, outer)).toEqual(["Outer"]);
  });

  it("keeps every line of an uneven box, without a neighbour's wall bleeding in", () => {
    const [platformKv, managedIdentity, backupSt] = findBoxes(unevenSiblings)!;
    expect(ownTextLines(unevenSiblings, platformKv)).toEqual([
      "Platform KV",
      "kv-astroshddev",
      "-platform",
      "• unseal-key",
      "• root-token",
      "• oidc-secret",
      "• recovery-keys",
    ]);
    expect(ownTextLines(unevenSiblings, managedIdentity)).toEqual([
      "Managed Identity",
      "id-astroshddev",
      "-openbao-001",
      "(Workload Ident.)",
    ]);
    expect(ownTextLines(unevenSiblings, backupSt)).toEqual([
      "Backup ST",
      "stastrobackupweu",
      "container: openbao",
      "(raft snapshots)",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/documents/diagram/ascii-boxes.test.ts`
Expected: FAIL — `Cannot find module './ascii-boxes'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/domain/documents/diagram/ascii-boxes.ts

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/documents/diagram/ascii-boxes.test.ts`
Expected: PASS, all 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/documents/diagram/ascii-boxes.ts src/domain/documents/diagram/ascii-boxes.test.ts
git commit -m "feat(diagram): find box-drawing rectangles and their nesting from text"
```

---

### Task 2: `ascii-arrows.ts` — edges from connector characters between siblings

**Files:**
- Create: `src/domain/documents/diagram/ascii-arrows.ts`
- Test: `src/domain/documents/diagram/ascii-arrows.test.ts`

**Interfaces:**
- Consumes: `Box`, `findBoxes` from `./ascii-boxes` (Task 1).
- Produces: `interface FoundEdge { from: Box; to: Box }`; `findVerticalEdges(lines: readonly string[], boxes: readonly Box[]): FoundEdge[]`; `findHorizontalEdges(lines: readonly string[], boxes: readonly Box[]): FoundEdge[]`. Task 3 imports both finder functions.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/documents/diagram/ascii-arrows.test.ts
import { describe, expect, it } from "vitest";
import { findBoxes } from "./ascii-boxes";
import { findHorizontalEdges, findVerticalEdges } from "./ascii-arrows";

const verticalFlow = [
  "┌─────────┐",
  "│ Request │",
  "└────┬────┘",
  "     │",
  "     v",
  "┌─────────┐",
  "│ Handler │",
  "└────┬────┘",
  "     │",
  "     v",
  "┌──────────┐",
  "│ Response │",
  "└──────────┘",
];

const horizontalFlow = [
  "┌─────┐        ┌─────┐",
  "│  A  │------->│  B  │",
  "└─────┘        └─────┘",
];

// The same uneven-height trio from ascii-boxes.test.ts: no arrow was drawn
// between them, only the ordinary gap between unconnected boxes.
const unevenSiblings = [
  '┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐',
  '│  Platform KV    │   │ Managed Identity │   │  Backup ST       │',
  '│ kv-astroshddev  │   │ id-astroshddev   │   │ stastrobackupweu │',
  '│ -platform       │   │ -openbao-001     │   │ container: openbao│',
  '│ • unseal-key    │   │ (Workload Ident.)│   │ (raft snapshots) │',
  '│ • root-token    │   └──────────────────┘   └──────────────────┘',
  '│ • oidc-secret   │',
  '│ • recovery-keys │',
  '└──────────────────┘',
];

describe("findVerticalEdges", () => {
  it("reads a chain of arrows down the page", () => {
    const boxes = findBoxes(verticalFlow)!;
    const edges = findVerticalEdges(verticalFlow, boxes);
    expect(edges).toHaveLength(2);
    expect(edges[0].from).toBe(boxes[0]);
    expect(edges[0].to).toBe(boxes[1]);
    expect(edges[1].from).toBe(boxes[1]);
    expect(edges[1].to).toBe(boxes[2]);
  });

  /**
   * This is the false positive that a naive "is there a wall character
   * between these two boxes" check produces: an enclosing box's own wall
   * drifts into the gap and reads as a connector. Requiring an explicit
   * arrowhead is what keeps it from being reported as a drawn relation.
   */
  it("invents no edge between boxes that share only a gap, not a connector", () => {
    const boxes = findBoxes(unevenSiblings)!;
    expect(findVerticalEdges(unevenSiblings, boxes)).toEqual([]);
  });
});

describe("findHorizontalEdges", () => {
  it("reads an arrow between two boxes on the same row", () => {
    const boxes = findBoxes(horizontalFlow)!;
    const edges = findHorizontalEdges(horizontalFlow, boxes);
    expect(edges).toEqual([{ from: boxes[0], to: boxes[1] }]);
  });

  it("invents no edge between boxes side by side with only a gap", () => {
    const boxes = findBoxes(unevenSiblings)!;
    expect(findHorizontalEdges(unevenSiblings, boxes)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/documents/diagram/ascii-arrows.test.ts`
Expected: FAIL — `Cannot find module './ascii-arrows'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/domain/documents/diagram/ascii-arrows.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/documents/diagram/ascii-arrows.test.ts`
Expected: PASS, all 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/documents/diagram/ascii-arrows.ts src/domain/documents/diagram/ascii-arrows.test.ts
git commit -m "feat(diagram): read arrows between sibling boxes, requiring an explicit head"
```

---

### Task 3: `ascii-parse.ts` — assemble the skeleton, or null

**Files:**
- Create: `src/domain/documents/diagram/ascii-parse.ts`
- Test: `src/domain/documents/diagram/ascii-parse.test.ts`

**Interfaces:**
- Consumes: `Box`, `findBoxes`, `ownTextLines` from `./ascii-boxes` (Task 1); `findVerticalEdges`, `findHorizontalEdges` from `./ascii-arrows` (Task 2); `DiagramNode`, `DiagramGroup`, `DiagramEdge` from `./diagram`.
- Produces: `interface ParsedSkeleton { nodes: Pick<DiagramNode,"id"|"label"|"note"|"group">[]; groups: DiagramGroup[]; edges: Pick<DiagramEdge,"from"|"to"|"label"|"style"|"head">[] }`; `parseAsciiDiagram(source: string): ParsedSkeleton | null`. Task 9 (`passage/route.ts`) imports `parseAsciiDiagram`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/documents/diagram/ascii-parse.test.ts
import { describe, expect, it } from "vitest";
import { parseAsciiDiagram } from "./ascii-parse";

// The exact drawing that shipped without a "parent" chain on every group —
// verbatim, including the column drift a hand-typed drawing really has.
const REPORTED_BUG = `┌──────────────────────────────────────────────────────────────────────┐
  │  dev cluster: subscription astro_shared_dev (westeurope)            │
  │                                                                      │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │  AKS cluster astro_shared_dev (namespace K8s: openbao)       │   │
  │  │                                                              │   │
  │  │  ┌────────────────────────────────────────────────────┐      │   │
  │  │  │  OpenBao instance (raft, auto-unseal via AKV)        │      │   │
  │  │  │                                                      │      │   │
  │  │  │  Root namespace (auth: oidc/)                        │      │   │
  │  │  │    policies: admin (path *), reader (path *)         │      │   │
  │  │  │                                                      │      │   │
  │  │  │  ┌────────────────────┐  ┌────────────────────┐       │      │   │
  │  │  │  │ OpenBao ns "dev/" │  │ OpenBao ns "uat/" │       │      │   │
  │  │  │  │  mount: kv/ (v2)  │  │  mount: kv/ (v2)  │       │      │   │
  │  │  │  │  policies:        │  │  policies:        │       │      │   │
  │  │  │  │    eso-reader    │  │    eso-reader    │       │      │   │
  │  │  │  │    dev-projects  │  │    uat-projects  │       │      │   │
  │  │  │  │    ci-terraform  │  │    ci-terraform  │       │      │   │
  │  │  │  │  auth: k8s+jwt  │  │  auth: k8s+jwt  │       │      │   │
  │  │  │  └────────────────────┘  └────────────────────┘       │      │   │
  │  │  └────────────────────────────────────────────────────┘      │   │
  │  └──────────────────────────────────────────────────────────────┘   │
  │                                                                      │
  │  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
  │  │  Platform KV    │   │ Managed Identity │   │  Backup ST       │  │
  │  │ kv-astroshddev  │   │ id-astroshddev   │   │ stastrobackupweu │  │
  │  │ -platform       │   │ -openbao-001     │   │ container: openbao│ │
  │  │ • unseal-key    │   │ (Workload Ident.)│   │ (raft snapshots) │  │
  │  │ • root-token    │   └──────────────────┘   └──────────────────┘  │
  │  │ • oidc-secret   │                                                 │
  │  │ • recovery-keys │                                                 │
  │  └──────────────────┘                                                 │
  └──────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │  prd cluster: subscription astro_shared_prd (westeurope) — SEPARATE  │
  │  Own OpenBao instance (own AKV, own MI, own ST). Blast-radius         │
  │  isolation: a dev outage must never affect prd.                       │
  └──────────────────────────────────────────────────────────────────────┘
`;

describe("parseAsciiDiagram", () => {
  it("returns null for prose with no drawing in it", () => {
    expect(parseAsciiDiagram("Just a paragraph about a cluster.")).toBeNull();
  });

  it("returns null for an unclosed box", () => {
    expect(parseAsciiDiagram("┌─────┐\n│ Oops")).toBeNull();
  });

  /**
   * This is the reported bug, pinned: three groups, each naming the one
   * directly outside it — "aks-cluster..." parented on "dev-cluster...",
   * "openbao-instance..." parented on "aks-cluster...". Losing that chain is
   * exactly what the model did; a deterministic parser cannot.
   */
  it("reads the full containment chain out of the reported drawing", () => {
    const parsed = parseAsciiDiagram(REPORTED_BUG);
    expect(parsed).not.toBeNull();

    expect(parsed!.groups).toEqual([
      {
        id: "dev-cluster-subscription-astro-shared-dev-westeurope",
        label: "dev cluster: subscription astro_shared_dev (westeurope)",
      },
      {
        id: "aks-cluster-astro-shared-dev-namespace-k8s-openbao",
        label: "AKS cluster astro_shared_dev (namespace K8s: openbao)",
        parent: "dev-cluster-subscription-astro-shared-dev-westeurope",
      },
      {
        id: "openbao-instance-raft-auto-unseal-via-akv",
        label: "OpenBao instance (raft, auto-unseal via AKV)",
        parent: "aks-cluster-astro-shared-dev-namespace-k8s-openbao",
      },
    ]);

    const byId = new Map(parsed!.nodes.map((node) => [node.id, node]));
    expect(byId.get("platform-kv")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("managed-identity")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("backup-st")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("openbao-ns-dev")?.group).toBe("openbao-instance-raft-auto-unseal-via-akv");
    expect(byId.get("openbao-ns-uat")?.group).toBe("openbao-instance-raft-auto-unseal-via-akv");
    expect(byId.get("prd-cluster-subscription-astro-shared-prd-westeurope-separate")?.group).toBeUndefined();

    expect(parsed!.edges).toEqual([]);
  });

  it("resolves an arrow to the two node ids it connects", () => {
    const source = [
      "┌─────┐        ┌─────┐",
      "│  A  │------->│  B  │",
      "└─────┘        └─────┘",
    ].join("\n");
    const parsed = parseAsciiDiagram(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(parsed!.edges).toEqual([{ from: "a", to: "b", label: null, style: "solid", head: "arrow" }]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/documents/diagram/ascii-parse.test.ts`
Expected: FAIL — `Cannot find module './ascii-parse'`

- [ ] **Step 3: Write the implementation**

```typescript
// src/domain/documents/diagram/ascii-parse.ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/documents/diagram/ascii-parse.test.ts`
Expected: PASS, all 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/documents/diagram/ascii-parse.ts src/domain/documents/diagram/ascii-parse.test.ts
git commit -m "feat(diagram): assemble a parsed skeleton from an ascii drawing"
```

---

### Task 4: `deadGroupError` — reject a group with nothing in it

**Files:**
- Modify: `src/domain/documents/diagram/group-tree.ts`
- Modify: `src/domain/documents/diagram/group-tree.test.ts`

**Interfaces:**
- Produces: `deadGroupError(nodes: readonly DiagramNode[], groups: readonly DiagramGroup[]): string | null`. Task 5 (`validation.ts`) imports it.

- [ ] **Step 1: Write the failing test**

Add to `src/domain/documents/diagram/group-tree.test.ts`. First, change its import line:

```typescript
import type { DiagramGroup, DiagramNode } from "./diagram";
import { deadGroupError, groupCycle, groupDepth, groupOrder, groupPath, outermostFirst } from "./group-tree";
```

Then append this `describe` block at the end of the file:

```typescript
describe("a group that holds nothing", () => {
  /**
   * Schema-legal today — nothing requires a group to have a member or a
   * child — and it is exactly the shape a model left behind when it dropped
   * a "parent" chain on a real drawing: three groups declared for boxes that
   * turned out to have nothing of their own inside them.
   */
  it("rejects a group with no member and no child", () => {
    expect(deadGroupError([], [{ id: "empty", label: "Empty" }])).toBe(
      'diagram group "empty" holds no node and no group',
    );
  });

  it("accepts a group with a direct member", () => {
    const nodes: DiagramNode[] = [{ id: "a", label: "A", group: "g" }];
    expect(deadGroupError(nodes, [{ id: "g", label: "G" }])).toBeNull();
  });

  it("accepts a group whose only content is a nested group", () => {
    const groups: DiagramGroup[] = [
      { id: "outer", label: "Outer" },
      { id: "inner", label: "Inner", parent: "outer" },
    ];
    expect(deadGroupError([], groups)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/documents/diagram/group-tree.test.ts`
Expected: FAIL — `deadGroupError is not exported` / `is not a function`

- [ ] **Step 3: Implement `deadGroupError`**

In `src/domain/documents/diagram/group-tree.ts`, change the import line:

```typescript
import { MAX_GROUP_DEPTH, type DiagramGroup, type DiagramNode } from "./diagram";
```

Then append at the end of the file:

```typescript
/**
 * A group nothing belongs to and nothing sits inside is dead weight: it
 * would draw a band around nothing, and if it was meant to hold something,
 * the "parent" that would say so is exactly what a model forgot on a real,
 * deep drawing — schema-legal, but never what anyone meant to declare.
 */
export function deadGroupError(
  nodes: readonly DiagramNode[],
  groups: readonly DiagramGroup[],
): string | null {
  const hasMember = new Set(
    nodes.map((node) => node.group).filter((group): group is string => group !== undefined),
  );
  const hasChild = new Set(
    groups.map((group) => group.parent).filter((parent): parent is string => parent !== undefined),
  );
  const dead = groups.find((group) => !hasMember.has(group.id) && !hasChild.has(group.id));
  return dead ? `diagram group "${dead.id}" holds no node and no group` : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/documents/diagram/group-tree.test.ts`
Expected: PASS, all tests including the 3 new ones

- [ ] **Step 5: Commit**

```bash
git add src/domain/documents/diagram/group-tree.ts src/domain/documents/diagram/group-tree.test.ts
git commit -m "feat(diagram): reject a group with no member and no child"
```

---

### Task 5: Wire `deadGroupError` into `diagramError`

**Files:**
- Modify: `src/domain/documents/diagram/validation.ts`
- Modify: `src/domain/documents/diagram/validation.test.ts`

**Interfaces:**
- Consumes: `deadGroupError` from `./group-tree` (Task 4).

- [ ] **Step 1: Write the failing test**

Add to `src/domain/documents/diagram/validation.test.ts`, right after the existing `it("accepts a group inside another", ...)` test (around line 160):

```typescript
  it("rejects a group that holds no node and no group", () => {
    const groups = [{ id: "empty", label: "Empty" }];
    expect(diagramError({ ...valid, groups })).toBe(
      'diagram group "empty" holds no node and no group',
    );
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/documents/diagram/validation.test.ts`
Expected: FAIL — `diagramError({...valid, groups})` returns `null`, not the dead-group message (`valid`'s own `groups: []` is unaffected by this change, so every other existing test in the file keeps passing; only the new one fails)

- [ ] **Step 3: Wire it in**

In `src/domain/documents/diagram/validation.ts`, change the import:

```typescript
import { deadGroupError, groupTreeError } from "./group-tree";
```

Then change the `diagramError` chain (around line 41-49) from:

```typescript
  return (
    nodesError(a.nodes) ??
    groupsError(a.groups) ??
    membershipError(a.nodes as DiagramNode[], a.groups as DiagramGroup[]) ??
    edgesError(a.edges, a.nodes as DiagramNode[]) ??
    textError("title", a.title) ??
    textError("caption", a.caption) ??
    kindError(a as DiagramAttrs)
  );
```

to:

```typescript
  return (
    nodesError(a.nodes) ??
    groupsError(a.groups) ??
    membershipError(a.nodes as DiagramNode[], a.groups as DiagramGroup[]) ??
    deadGroupError(a.nodes as DiagramNode[], a.groups as DiagramGroup[]) ??
    edgesError(a.edges, a.nodes as DiagramNode[]) ??
    textError("title", a.title) ??
    textError("caption", a.caption) ??
    kindError(a as DiagramAttrs)
  );
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/documents/diagram/validation.test.ts`
Expected: PASS, all tests including the new one — confirm no existing test regressed (the `valid` fixture's `groups: []` and every group fixture used elsewhere in the file already has a member or a child)

- [ ] **Step 5: Commit**

```bash
git add src/domain/documents/diagram/validation.ts src/domain/documents/diagram/validation.test.ts
git commit -m "fix(diagram): diagramError now rejects a dead group"
```

---

### Task 6: Worked nesting example in the diagram format contract

**Files:**
- Modify: `src/domain/authoring/prompts/blocks/layout.ts`

No test: this is prose the model reads, not code with a behavioral contract to pin. It helps the free-prompt case (no ascii source, no parser assist), where a model still has to invent nesting from a text description.

- [ ] **Step 1: Add the worked example**

In `src/domain/authoring/prompts/blocks/layout.ts`, the `diagram` line currently ends (after the sentence about nesting depth) with:

```
...omit it at the top level, never make two groups each other's parent, and nest at most 4 deep. Kinds: "flow" = a process, ...
```

Change it to insert one sentence between "...nest at most 4 deep." and "Kinds:":

```
...omit it at the top level, never make two groups each other's parent, and nest at most 4 deep. A subscription holding a cluster holding a namespace is three groups, each naming only the one directly outside it — \`groups:[{"id":"g0","label":"Subscription"},{"id":"g1","label":"Cluster","parent":"g0"},{"id":"g2","label":"Namespace","parent":"g1"}]\` — never only the outermost. Kinds: "flow" = a process, ...
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this is a string literal edit only)

- [ ] **Step 3: Commit**

```bash
git add src/domain/authoring/prompts/blocks/layout.ts
git commit -m "docs(diagram): show the parent chain, not just the rule, in the format contract"
```

---

### Task 7: `Surface` carries which block-action fired

**Files:**
- Modify: `src/domain/authoring/agents/routing.ts`
- Modify: `src/components/editor/useBlockAction.ts`

**Interfaces:**
- Produces: `Surface`'s `block-action` variant gains `actionId?: BlockAction["id"]`. Task 9 (`passage/route.ts`) reads `surface.actionId`.

- [ ] **Step 1: Confirm the existing test still describes the contract**

`src/domain/authoring/agents/routing.test.ts` already constructs `{ kind: "block-action", family: "..." }` without `actionId` in every test (e.g. line 9, line 39). Since the field will be optional, no test changes are needed here — this step is verification, not a new test.

Run: `npx vitest run src/domain/authoring/agents/routing.test.ts`
Expected: PASS (before any change — confirms the baseline)

- [ ] **Step 2: Add the field**

In `src/domain/authoring/agents/routing.ts`, change:

```typescript
export type Surface =
  /** One of the catalog's per-block actions; its family names the assistant. */
  | { kind: "block-action"; family: BlockAction["family"] }
```

to:

```typescript
export type Surface =
  /** One of the catalog's per-block actions; its family names the assistant. */
  | { kind: "block-action"; family: BlockAction["family"]; actionId?: BlockAction["id"] }
```

- [ ] **Step 3: Supply it from the one production call site**

In `src/components/editor/useBlockAction.ts`, change:

```typescript
              surface: { kind: "block-action", family: action.family },
```

to:

```typescript
              surface: { kind: "block-action", family: action.family, actionId: action.id },
```

- [ ] **Step 4: Run the tests to verify nothing broke**

Run: `npx vitest run src/domain/authoring/agents/routing.test.ts`
Expected: PASS, unchanged — `actionId` being optional means every existing literal still type-checks

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add src/domain/authoring/agents/routing.ts src/components/editor/useBlockAction.ts
git commit -m "feat(diagram): Surface carries which block-action fired"
```

---

### Task 8: `selectionBlocksPrompt` accepts a given skeleton

**Files:**
- Modify: `src/domain/authoring/prompts/selection.ts`
- Create: `src/domain/authoring/prompts/selection.test.ts`

**Interfaces:**
- Produces: `selectionBlocksPrompt(excerpt: string, instruction: string, skeleton?: string): string`. Task 9 (`passage/route.ts`) calls it with the third argument.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/authoring/prompts/selection.test.ts
import { describe, expect, it } from "vitest";
import { selectionBlocksPrompt } from "./selection";

describe("selectionBlocksPrompt", () => {
  it("carries the excerpt and the instruction with no skeleton given", () => {
    const prompt = selectionBlocksPrompt("Excerpt text", "Turn into a chart");
    expect(prompt).toBe("Excerpt:\nExcerpt text\n\nInstruction: Turn into a chart");
  });

  it("states a given skeleton as what the model must keep, not invent", () => {
    const skeleton = '{"nodes":[{"id":"a","label":"A"}],"groups":[],"edges":[]}';
    const prompt = selectionBlocksPrompt("Excerpt text", "Turn into a diagram", skeleton);
    expect(prompt).toContain("Excerpt:\nExcerpt text\n\nInstruction: Turn into a diagram");
    expect(prompt).toContain(skeleton);
    expect(prompt).toMatch(/use these ids, labels, groups and edges/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/authoring/prompts/selection.test.ts`
Expected: FAIL — the second test fails because the current `selectionBlocksPrompt` takes only 2 parameters and never mentions a skeleton

- [ ] **Step 3: Implement**

In `src/domain/authoring/prompts/selection.ts`, change:

```typescript
export function selectionBlocksPrompt(excerpt: string, instruction: string): string {
  return `Excerpt:\n${excerpt}\n\nInstruction: ${instruction}`;
}
```

to:

```typescript
export function selectionBlocksPrompt(excerpt: string, instruction: string, skeleton?: string): string {
  const given = skeleton
    ? `\n\nThe diagram's structure was already read off the drawing below — use these ids, labels, groups and edges exactly as given; invent none, drop none, rename none. Add only "kind", "direction", and per-node "accent"/"icon":\n${skeleton}`
    : "";
  return `Excerpt:\n${excerpt}\n\nInstruction: ${instruction}${given}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/domain/authoring/prompts/selection.test.ts`
Expected: PASS, both tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/authoring/prompts/selection.ts src/domain/authoring/prompts/selection.test.ts
git commit -m "feat(diagram): selectionBlocksPrompt can hand the model a given structure"
```

---

### Task 9: Wire the parser into the passage route

**Files:**
- Modify: `src/app/api/passage/route.ts`

**Interfaces:**
- Consumes: `parseAsciiDiagram` from `@/domain/documents/diagram/ascii-parse` (Task 3); `selectionBlocksPrompt(excerpt, instruction, skeleton?)` (Task 8); `surface.actionId` (Task 7).

No new test file: routes in this codebase are thin and untested directly (confirmed — no `*.test.ts` exists anywhere under `src/app/api/`); this wiring is covered by Task 3's and Task 8's unit tests plus manual verification in Step 3 below.

- [ ] **Step 1: Make the change**

In `src/app/api/passage/route.ts`, add the import:

```typescript
import { parseAsciiDiagram } from "@/domain/documents/diagram/ascii-parse";
```

Then change the body of `POST` from:

```typescript
  const passage = blocks as DocumentNode[];
  const assignment = routeSurface(surface ?? { kind: "free-prompt" });
  const agent = agentById(assignment.steps[0] ?? "writer");
  const style = await getStyleParameters();

  return blockStreamResponse({
    system: agentSystem(agent, style),
    prompt: selectionBlocksPrompt(blocksToModelMarkdown(passage), instruction),
    temperature: agent.temperature,
    effort: effortFor("passage"),
    maxTokens: tokensFor("passage"),
    style,
    // Said before the first block, so the user reads who is working while they work.
    prelude: { reason: assignment.reason },
    verdict: (written) => charterBreach(agent, passage, written),
  });
```

to:

```typescript
  const passage = blocks as DocumentNode[];
  const assignment = routeSurface(surface ?? { kind: "free-prompt" });
  const agent = agentById(assignment.steps[0] ?? "writer");
  const style = await getStyleParameters();
  const excerpt = blocksToModelMarkdown(passage);
  const skeleton =
    surface?.kind === "block-action" && surface.actionId === "into-diagram"
      ? parseAsciiDiagram(excerpt)
      : null;

  return blockStreamResponse({
    system: agentSystem(agent, style),
    prompt: selectionBlocksPrompt(excerpt, instruction, skeleton ? JSON.stringify(skeleton) : undefined),
    temperature: agent.temperature,
    effort: effortFor("passage"),
    maxTokens: tokensFor("passage"),
    style,
    // Said before the first block, so the user reads who is working while they work.
    prelude: { reason: assignment.reason },
    verdict: (written) => charterBreach(agent, passage, written),
  });
```

(`generator` is added to this same call in Task 11, once `BlockStream` requires it — leave this task's version building on its own; Task 11 adds one more field.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Manual verification**

Using the `run-docyfier` skill: start the dev server, open `/doc/u2-demo` (or any document), paste the reported bug's ascii drawing as a code block, run "Turn into a diagram" from the block's drag-handle menu, and confirm the resulting diagram's groups nest (AKS cluster's band sits inside dev cluster's, OpenBao instance's inside that) rather than rendering as flat, unconnected bands.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/passage/route.ts
git commit -m "feat(diagram): hand the model a parsed skeleton for ascii-art conversions"
```

---

### Task 10: `read-block-stream.ts` keeps what failed, and can repair it

**Files:**
- Modify: `src/lib/ai/read-block-stream.ts`
- Create: `src/lib/ai/read-block-stream.test.ts`

**Interfaces:**
- Consumes: `TextGenerator`, `GenerationRequest` from `@/domain/authoring/text-generator`; `effortFor`, `tokensFor` from `@/domain/authoring/thinking`.
- Produces: `Read.retriable: { raw: string; error: string }[]`; `prepare(raw: string, style: StyleParameters): unknown` (now exported); `repairFailedBlocks(generator: TextGenerator, request: { system: string; prompt: string; temperature: number }, read: Read, style: StyleParameters, send: (block: unknown) => void): Promise<void>`. Task 11 (`block-stream-response.ts`) calls `repairFailedBlocks`.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/lib/ai/read-block-stream.test.ts
import { describe, expect, it } from "vitest";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import type { GeneratedText, GenerationRequest, TextGenerator } from "@/domain/authoring/text-generator";
import { emptyRead, readAnswer, repairFailedBlocks, type Part } from "./read-block-stream";

const style = StyleParameters.defaults();

function partsOf(...parts: Part[]): { parts: AsyncIterator<Part>; firstText: string } {
  const [first, ...rest] = parts;
  let i = 0;
  return {
    firstText: (first as { text: string }).text,
    parts: {
      next: async () => {
        if (i >= rest.length) return { done: true, value: undefined as never };
        return { done: false, value: rest[i++] };
      },
    },
  };
}

function textDelta(text: string): Part {
  return { type: "text-delta", text } as unknown as Part;
}

describe("readAnswer", () => {
  it("keeps a block the schema rejects for repair, rather than only counting it", async () => {
    const read = emptyRead();
    const blocks: unknown[] = [];
    const source = partsOf(textDelta('::: diagram {"kind":"nonsense"}\n:::\n'));
    await readAnswer(source, style, (block) => blocks.push(block), read);
    expect(read.blocks).toBe(0);
    expect(read.retriable).toHaveLength(1);
    expect(read.retriable[0].raw).toBe('::: diagram {"kind":"nonsense"}\n:::');
  });
});

describe("repairFailedBlocks", () => {
  const request = { system: "You draw diagrams.", prompt: "Draw one.", temperature: 0.2 };

  it("sends what failed and the exact error, and accepts a corrected block", async () => {
    const read = emptyRead();
    read.retriable = [
      {
        raw: '::: diagram {"kind":"nonsense"}\n:::',
        error: 'diagram "kind" must be one of flow, architecture, sequence, hierarchy, timeline',
      },
    ];
    const sent: unknown[] = [];
    const seenPrompts: string[] = [];
    const generator: TextGenerator = {
      async generate(req: GenerationRequest): Promise<GeneratedText> {
        seenPrompts.push(req.prompt);
        return {
          text: '::: diagram {"kind":"flow","direction":"down","nodes":[{"id":"a","label":"A"}],"edges":[],"groups":[],"title":null,"caption":null}\n:::',
          truncated: false,
        };
      },
    };

    await repairFailedBlocks(generator, request, read, style, (block) => sent.push(block));

    expect(read.retriable).toHaveLength(0);
    expect(read.skipped).toBe(0);
    expect(read.blocks).toBe(1);
    expect(sent).toHaveLength(1);
    expect(seenPrompts[0]).toContain("nonsense");
    expect(seenPrompts[0]).toContain('diagram "kind" must be one of');
  });

  it("drops a block that fails again after one repair attempt, with no further retry", async () => {
    const read = emptyRead();
    read.retriable = [{ raw: '::: diagram {"kind":"nonsense"}\n:::', error: "still wrong" }];
    let calls = 0;
    const generator: TextGenerator = {
      async generate(): Promise<GeneratedText> {
        calls++;
        return { text: '::: diagram {"kind":"still-nonsense"}\n:::', truncated: false };
      },
    };

    await repairFailedBlocks(generator, request, read, style, () => {});

    expect(calls).toBe(1);
    expect(read.skipped).toBe(1);
    expect(read.blocks).toBe(0);
  });

  it("drops a block when the repair call itself fails", async () => {
    const read = emptyRead();
    read.retriable = [{ raw: "bad", error: "bad" }];
    const generator: TextGenerator = {
      async generate(): Promise<GeneratedText> {
        throw new Error("provider unreachable");
      },
    };

    await repairFailedBlocks(generator, request, read, style, () => {});

    expect(read.skipped).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/ai/read-block-stream.test.ts`
Expected: FAIL — `retriable` does not exist on `Read`, `repairFailedBlocks` is not exported

- [ ] **Step 3: Implement**

In `src/lib/ai/read-block-stream.ts`, add imports:

```typescript
import type { TextGenerator } from "@/domain/authoring/text-generator";
import { effortFor, tokensFor } from "@/domain/authoring/thinking";
```

Change `Read` and `emptyRead`:

```typescript
export interface Read {
  /** Why the answer ended badly, or null when it ended. */
  stopped: string | null;
  written: DocumentNode[];
  blocks: number;
  skipped: number;
  /** What the schema rejected and why, kept for one repair attempt each. */
  retriable: { raw: string; error: string }[];
  /** What was read off the stream, so the wait can be told apart from the answer. */
  answer: AnswerSize;
  usage: unknown;
}

export function emptyRead(): Read {
  return {
    stopped: null,
    written: [],
    blocks: 0,
    skipped: 0,
    retriable: [],
    answer: { chars: 0, thinking: 0 },
    usage: null,
  };
}
```

Export `prepare` (was private):

```typescript
export function prepare(raw: string, style: StyleParameters): unknown {
```

Change the `emit` function's catch block inside `readAnswer` from:

```typescript
    } catch (err) {
      // A block the schema rejects is dropped rather than aborting the answer;
      // the count is reported in the terminal line.
      console.error("[ai] streamed block rejected:", message(err));
      read.skipped++;
    }
```

to:

```typescript
    } catch (err) {
      // Kept for one repair attempt (`repairFailedBlocks`) rather than dropped
      // outright: the schema already names what is wrong, which is what a
      // retry needs and a silent drop throws away.
      console.error("[ai] streamed block rejected:", message(err));
      read.retriable.push({ raw, error: message(err) });
    }
```

Append at the end of the file:

```typescript
interface RepairContext {
  system: string;
  prompt: string;
  temperature: number;
}

/**
 * One bounded second chance for a block the schema rejected. `diagramError`
 * (and every other block validator) already names the offending node or
 * edge, so the model is handed the exact reason rather than asked to guess
 * again from scratch.
 */
async function repairBlock(
  generator: TextGenerator,
  request: RepairContext,
  raw: string,
  error: string,
): Promise<string | null> {
  const prompt = `${request.prompt}\n\nYour previous answer for one block was rejected: ${error}\nWhat you wrote:\n${raw}\n\nWrite ONLY a corrected replacement for that one block, in the same format.`;
  try {
    const { text, truncated } = await generator.generate({
      system: request.system,
      prompt,
      temperature: request.temperature,
      effort: effortFor("block"),
      maxTokens: tokensFor("block"),
    });
    return truncated ? null : text;
  } catch {
    return null;
  }
}

/**
 * Every block the stream dropped gets one repair attempt, in order, after
 * the stream itself has finished — never during it, so a block still
 * landing live is never delayed by one that already failed. A block that
 * fails twice stays dropped: no further retry.
 */
export async function repairFailedBlocks(
  generator: TextGenerator,
  request: RepairContext,
  read: Read,
  style: StyleParameters,
  send: (block: unknown) => void,
): Promise<void> {
  const retriable = read.retriable;
  read.retriable = [];
  for (const { raw, error } of retriable) {
    const fixed = await repairBlock(generator, request, raw, error);
    if (fixed === null) {
      read.skipped++;
      continue;
    }
    try {
      const block = prepare(fixed, style);
      send(block);
      read.written.push(block as DocumentNode);
      read.blocks++;
    } catch (err) {
      console.error("[ai] repaired block still rejected:", message(err));
      read.skipped++;
    }
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/ai/read-block-stream.test.ts`
Expected: PASS, all tests

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/read-block-stream.ts src/lib/ai/read-block-stream.test.ts
git commit -m "feat(ai): keep a failed block for one repair attempt instead of dropping it"
```

---

### Task 11: Wire the repair pass into the stream response and its two callers

**Files:**
- Modify: `src/lib/ai/block-stream-response.ts`
- Modify: `src/app/api/passage/route.ts`
- Modify: `src/app/api/caret/route.ts`

**Interfaces:**
- Consumes: `repairFailedBlocks` from `./read-block-stream` (Task 10); `authoringDeps` from `@/lib/ai/service` (existing); `TextGenerator` from `@/domain/authoring/text-generator`.

No new test file: `blockStreamResponse` itself calls the real `streamText` from `"ai"` internally (unchanged, no injection seam exists for it in this codebase — confirmed no precedent anywhere for mocking the `ai` package), so it is not unit-tested directly today and this task does not change that. The new logic it calls (`repairFailedBlocks`) is already fully covered by Task 10's tests with a fake `TextGenerator`. This task is verified by Step 3's manual check plus the existing test suite staying green.

- [ ] **Step 1: Make `blockStreamResponse` take and use a generator**

In `src/lib/ai/block-stream-response.ts`, add the import:

```typescript
import type { TextGenerator } from "@/domain/authoring/text-generator";
```

and add `repairFailedBlocks` to the existing import from `./read-block-stream`:

```typescript
import { emptyRead, readAnswer, repairFailedBlocks, type Part } from "./read-block-stream";
```

Change the `BlockStream` interface — add one field:

```typescript
export interface BlockStream {
  readonly system: string;
  readonly prompt: string;
  readonly temperature: number;
  /** How much thinking this surface is worth; absent leaves the model to itself. */
  readonly effort?: ThinkingEffort;
  /** The most this answer may cost, capped again by what the provider allows. */
  readonly maxTokens?: number;
  /** The instance's writing style: the same pass the blocking path applies. */
  readonly style: StyleParameters;
  /** What a failed block is repaired with — injected, never fetched: this
   * module stays a pure function of its request, testable without a
   * provider or Settings. */
  readonly generator: TextGenerator;
  /** An NDJSON line to send before the first block — the document's dress. */
  readonly prelude?: Record<string, unknown>;
  verdict?(blocks: DocumentNode[]): string;
}
```

Change the body of `blockStreamResponse`'s `start()` callback from:

```typescript
      try {
        if (request.prelude) controller.enqueue(encoder.encode(line(request.prelude)));
        await readAnswer({ parts, firstText }, request.style, send, read);

        const breach = read.stopped ? "" : (request.verdict?.(read.written) ?? "");
```

to:

```typescript
      try {
        if (request.prelude) controller.enqueue(encoder.encode(line(request.prelude)));
        await readAnswer({ parts, firstText }, request.style, send, read);
        if (read.retriable.length > 0) {
          await repairFailedBlocks(request.generator, request, read, request.style, send);
        }

        const breach = read.stopped ? "" : (request.verdict?.(read.written) ?? "");
```

- [ ] **Step 2: Supply the generator from both callers**

In `src/app/api/passage/route.ts`, add the import:

```typescript
import { authoringDeps } from "@/lib/ai/service";
```

Change:

```typescript
  const style = await getStyleParameters();
  const excerpt = blocksToModelMarkdown(passage);
```

to:

```typescript
  const style = await getStyleParameters();
  const { generator } = await authoringDeps();
  const excerpt = blocksToModelMarkdown(passage);
```

and add `generator,` to the `blockStreamResponse({...})` call (any position among the object's fields):

```typescript
  return blockStreamResponse({
    system: agentSystem(agent, style),
    prompt: selectionBlocksPrompt(excerpt, instruction, skeleton ? JSON.stringify(skeleton) : undefined),
    temperature: agent.temperature,
    effort: effortFor("passage"),
    maxTokens: tokensFor("passage"),
    style,
    generator,
    prelude: { reason: assignment.reason },
    verdict: (written) => charterBreach(agent, passage, written),
  });
```

In `src/app/api/caret/route.ts`, add the same import:

```typescript
import { authoringDeps } from "@/lib/ai/service";
```

Change:

```typescript
  const style = await getStyleParameters();
  return blockStreamResponse({
    system: caretSystem(style),
    prompt: caretPrompt(
      typeof digest === "string" ? digest : "",
      typeof here === "string" ? here : "",
      instruction,
    ),
    temperature: 0.6,
    // The user is watching this one land at their cursor.
    effort: effortFor("block"),
    maxTokens: tokensFor("block"),
    style,
  });
```

to:

```typescript
  const style = await getStyleParameters();
  const { generator } = await authoringDeps();
  return blockStreamResponse({
    system: caretSystem(style),
    prompt: caretPrompt(
      typeof digest === "string" ? digest : "",
      typeof here === "string" ? here : "",
      instruction,
    ),
    temperature: 0.6,
    // The user is watching this one land at their cursor.
    effort: effortFor("block"),
    maxTokens: tokensFor("block"),
    style,
    generator,
  });
```

- [ ] **Step 3: Typecheck, run the whole suite, and verify manually**

Run: `npx tsc --noEmit`
Expected: no errors — this is the step that catches a missed call site if `BlockStream` gains a required field somewhere this plan did not find

Run: `npx vitest run`
Expected: PASS, entire suite (this task touches two composition-root call sites; a full run is the only way to be sure nothing else constructs a `BlockStream` literal)

Manual check with the `run-docyfier` skill: reproduce the original report (paste the ascii drawing, "turn into a diagram"); confirm the block converts. If it still fails once, that failure is now the interesting case to inspect — it means the repair prompt itself needs a look, not that the plumbing is broken.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/block-stream-response.ts src/app/api/passage/route.ts src/app/api/caret/route.ts
git commit -m "feat(ai): repair a failed block once before the stream reports done"
```

---

## Post-plan check

Run the full gate before considering this done: `npx tsc --noEmit && npx eslint . && npx vitest run --coverage`. Confirm the coverage floor (80% overall, 95% on `domain/`) still holds — the four new `domain/documents/diagram/` files are pure and fully unit-tested, so this should move coverage up, not down.
