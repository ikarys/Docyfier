import { describe, expect, it } from "vitest";
import { readAssignment, routeSurface, WRITER_ONLY } from "./routing";

describe("routeSurface", () => {
  it("sends a rewrite action to the writer alone", () => {
    expect(routeSurface({ kind: "block-action", family: "rewrite" })?.steps).toEqual(["writer"]);
  });

  it("sends a turn-into action to the layout assistant alone", () => {
    expect(routeSurface({ kind: "block-action", family: "turn-into" })?.steps).toEqual([
      "designer",
    ]);
  });

  it("sends a selection quick action to the writer alone", () => {
    expect(routeSurface({ kind: "selection-quick" })?.steps).toEqual(["writer"]);
  });

  /** The one surface where the request itself has to be read: only there is a
   * model call worth its seconds. */
  it("hands back nothing for a free prompt, which nobody can route by shape", () => {
    expect(routeSurface({ kind: "free-prompt" })).toBeNull();
  });

  it("explains itself, because the user is told what is running", () => {
    expect(routeSurface({ kind: "block-action", family: "turn-into" })?.reason).toMatch(
      /arranges/i,
    );
  });
});

describe("readAssignment", () => {
  it("reads the steps a router answered with", () => {
    const assignment = readAssignment({ steps: ["writer", "designer"], reason: "both" });

    expect(assignment.steps).toEqual(["writer", "designer"]);
    expect(assignment.reason).toBe("both");
  });

  it("keeps the order it was given: the words come before their box", () => {
    expect(readAssignment({ steps: ["designer", "writer"] }).steps).toEqual([
      "writer",
      "designer",
    ]);
  });

  it("drops a step that names no assistant", () => {
    expect(readAssignment({ steps: ["writer", "proofreader"] }).steps).toEqual(["writer"]);
  });

  it("falls back on the writer alone when the answer names nobody", () => {
    expect(readAssignment({ steps: [] })).toEqual(WRITER_ONLY);
    expect(readAssignment("nonsense")).toEqual(WRITER_ONLY);
  });

  it("never runs the same assistant twice", () => {
    expect(readAssignment({ steps: ["writer", "writer"] }).steps).toEqual(["writer"]);
  });
});
