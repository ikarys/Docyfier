import { describe, expect, it } from "vitest";
import { wantsAsciiDiagramSkeleton } from "./into-diagram";

/**
 * Nothing tested this gate directly before: the entire parser-wiring feature
 * (PLAN.md STEP 10) depends on it firing exactly on "turn into a diagram" and
 * never on a neighbour like "turn into a table" — an inversion, or `actionId`
 * silently no longer reaching the route from `useBlockAction.ts`, would have
 * gone uncaught.
 */
describe("wantsAsciiDiagramSkeleton", () => {
  it("wants a skeleton for an into-diagram block action", () => {
    expect(
      wantsAsciiDiagramSkeleton({ kind: "block-action", family: "turn-into", actionId: "into-diagram" }),
    ).toBe(true);
  });

  it("wants no skeleton for a different action in the same family", () => {
    expect(
      wantsAsciiDiagramSkeleton({ kind: "block-action", family: "turn-into", actionId: "into-table" }),
    ).toBe(false);
  });

  it("wants no skeleton for a surface that is not a block action", () => {
    expect(wantsAsciiDiagramSkeleton({ kind: "free-prompt" })).toBe(false);
  });

  it("wants no skeleton when there is no surface at all", () => {
    expect(wantsAsciiDiagramSkeleton(undefined)).toBe(false);
  });
});
