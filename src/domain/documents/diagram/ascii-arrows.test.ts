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
