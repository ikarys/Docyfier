import { describe, expect, it } from "vitest";
import { routeSurface, type Surface } from "./routing";

describe("routeSurface", () => {
  it("sends a rewrite action to the writer alone", () => {
    expect(routeSurface({ kind: "block-action", family: "rewrite" }).steps).toEqual(["writer"]);
  });

  it("sends a turn-into action to the layout assistant alone", () => {
    expect(routeSurface({ kind: "block-action", family: "turn-into" }).steps).toEqual([
      "designer",
    ]);
  });

  it("sends a rewording button to the writer alone", () => {
    expect(routeSurface({ kind: "rewording" }).steps).toEqual(["writer"]);
  });

  it("sends a styling button to the layout assistant alone", () => {
    expect(routeSurface({ kind: "styling" }).steps).toEqual(["designer"]);
  });

  /**
   * A free prompt used to be read by a model — a whole round trip spent
   * deciding who would then do the work. The writer is the safe half of any
   * request, and the other half is one click away on a passage that has settled.
   */
  it("answers a free prompt with the writer, without asking anyone", () => {
    expect(routeSurface({ kind: "free-prompt" }).steps).toEqual(["writer"]);
  });

  it("never asks for two assistants, because that is two waits in one click", () => {
    const surfaces: Surface[] = [
      { kind: "block-action", family: "rewrite" },
      { kind: "block-action", family: "turn-into" },
      { kind: "styling" },
      { kind: "rewording" },
      { kind: "free-prompt" },
    ];

    for (const surface of surfaces) {
      expect(routeSurface(surface).steps).toHaveLength(1);
    }
  });

  it("explains itself, because the user is told what is running", () => {
    expect(routeSurface({ kind: "block-action", family: "turn-into" }).reason).toMatch(
      /arranges/i,
    );
  });
});
