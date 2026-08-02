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
 * A whole document's 32 768 tokens sent with a request to redraw one block buys
 * an answer that cannot exceed a few hundred — so a small call is kept small.
 * What that first cut got wrong is that the ceiling is not the answer's: a
 * provider counts what the model thought against it too.
 */
describe("tokensFor", () => {
  it("keeps a block and a passage well under what a document may spend", () => {
    expect(tokensFor("block")).toBeLessThan(tokensFor("passage"));
    expect(tokensFor("passage")).toBeLessThan(32_768);
  });

  /**
   * Measured, and the reason this file changed: turning one 2.9 KB drawing into
   * a diagram cost the reference model 3 555 tokens of thinking for 376 tokens
   * of answer. Under a 4 096 ceiling it never wrote a character — the budget was
   * gone before the answer began, and the failure read as "the block is too
   * large" when the block was fine.
   *
   * Raising it did not buy more deliberation, which is what the first cut
   * feared: the same call thought 3 741 tokens under 4 096 and 3 555 under
   * 16 384. Thinking is what the question costs, not what the ceiling allows.
   */
  it("leaves a reasoning model room to think before it writes", () => {
    expect(tokensFor("block")).toBeGreaterThanOrEqual(8192);
    expect(tokensFor("passage")).toBeGreaterThanOrEqual(8192 + 4096);
  });

  it("gives a whole document more room than a passage", () => {
    expect(tokensFor("document")).toBeGreaterThan(tokensFor("passage"));
  });

  /**
   * The point is to stop a small call buying a document's worth of thinking,
   * never to cap a document. Guessing a ceiling here would silently undo the
   * budget somebody raised in Settings, and the answer would come back cut off
   * — reported as "the document is too large", which it was not.
   */
  it("hands a whole document the budget the instance chose, however large", () => {
    expect(tokensFor("document", 128_000)).toBe(128_000);
    expect(tokensFor("document", 8_192)).toBe(8_192);
  });

  /** The instance's own ceiling still wins: it is the one somebody chose. */
  it("never asks for more than the provider allows", () => {
    for (const stake of ["block", "passage", "document"] as const) {
      expect(tokensFor(stake, 1024)).toBeLessThanOrEqual(1024);
    }
  });
});
