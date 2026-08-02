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
