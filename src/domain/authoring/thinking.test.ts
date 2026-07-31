import { describe, expect, it } from "vitest";
import { effortFor, tokensFor } from "./thinking";

describe("effortFor", () => {
  /**
   * Measured, not assumed: a whole-document edit asked with the least thinking
   * came back as two delete operations — 55 characters for a document of sixty
   * blocks. The same call with no limit spent its entire output budget
   * deliberating and wrote nothing at all. What it is worth is the middle.
   */
  it("gives a whole-document edit room to plan", () => {
    expect(effortFor("document")).toBe("medium");
  });

  it("spends nothing on a block or a passage", () => {
    expect(effortFor("block")).toBe("low");
    expect(effortFor("passage")).toBe("low");
  });
});

/**
 * The other half of what a call is worth, and the one that was never said.
 *
 * A reasoning model calibrates how long it deliberates on the budget it is
 * handed, so a whole document's 32 768 tokens sent with a request to redraw one
 * block buys minutes of thinking for an answer that cannot exceed a few hundred
 * tokens. `reasoning_effort` asks; this one does not ask.
 */
describe("tokensFor", () => {
  it("keeps a block and a passage to what their answer can hold", () => {
    expect(tokensFor("block")).toBeLessThan(4096);
    expect(tokensFor("passage")).toBeLessThan(8192);
  });

  it("gives a whole document more room than a passage", () => {
    expect(tokensFor("document")).toBeGreaterThan(tokensFor("passage"));
  });

  /** The instance's own ceiling still wins: it is the one somebody chose. */
  it("never asks for more than the provider allows", () => {
    for (const stake of ["block", "passage", "document"] as const) {
      expect(tokensFor(stake, 1024)).toBeLessThanOrEqual(1024);
    }
  });
});
