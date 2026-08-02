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

// The exact midpoint of the overlap between these two boxes is column 5, but
// the arrow is drawn one column to its left (column 4) — an ordinary,
// well-centered hand-drawn arrow that just doesn't land on the exact
// rounded midpoint. Only checking that one column misses it entirely.
const verticalOffCenter = [
  "┌─────────┐",
  "│ Request │",
  "└────┬────┘",
  "    │",
  "    v",
  "┌─────────┐",
  "│ Handler │",
  "└─────────┘",
];

const upwardArrow = [
  "┌─────────┐",
  "│ Request │",
  "└────┬────┘",
  "     │",
  "     ^",
  "┌─────────┐",
  "│ Handler │",
  "└─────────┘",
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

  it("finds an arrow drawn one column off the exact midpoint", () => {
    const boxes = findBoxes(verticalOffCenter)!;
    expect(findVerticalEdges(verticalOffCenter, boxes)).toEqual([
      { from: boxes[0], to: boxes[1] },
    ]);
  });

  it("recognizes an upward-drawn arrowhead", () => {
    const boxes = findBoxes(upwardArrow)!;
    expect(findVerticalEdges(upwardArrow, boxes)).toEqual([{ from: boxes[0], to: boxes[1] }]);
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

  /**
   * The exact midpoint row of the overlap between these two boxes (of
   * uneven height) has no connector on it — the real arrow is drawn on the
   * boxes' own top border row instead. Only checking the rounded midpoint
   * row misses it entirely.
   */
  it("finds an arrow drawn one row off the exact midpoint", () => {
    const top = "┌─────┐" + "------->" + "┌───────┐";
    const a = "│  A  │" + " ".repeat(8) + "│       │";
    const b = "└─────┘" + " ".repeat(8) + "│   B   │";
    const c = " ".repeat(15) + "│       │";
    const bottom = " ".repeat(15) + "└───────┘";
    const horizontalOffCenter = [top, a, b, c, bottom];

    const boxes = findBoxes(horizontalOffCenter)!;
    expect(findHorizontalEdges(horizontalOffCenter, boxes)).toEqual([
      { from: boxes[0], to: boxes[1] },
    ]);
  });

  it("recognizes a leftward-drawn arrowhead", () => {
    const leftwardArrow = [
      "┌─────┐        ┌─────┐",
      "│  A  │<-------│  B  │",
      "└─────┘        └─────┘",
    ];
    const boxes = findBoxes(leftwardArrow)!;
    expect(findHorizontalEdges(leftwardArrow, boxes)).toEqual([
      { from: boxes[0], to: boxes[1] },
    ]);
  });
});
