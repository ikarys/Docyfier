import { describe, expect, it } from "vitest";
import { usageLine } from "./usage-log";

describe("usageLine", () => {
  it("reports what was written and how fast", () => {
    const line = usageLine("caret", 4_000, { inputTokens: 900, outputTokens: 200 });

    expect(line).toContain("caret");
    expect(line).toContain("4.0s");
    expect(line).toContain("out 200");
    expect(line).toContain("50 tok/s");
  });

  /** The number this whole log exists for: time spent thinking is invisible in
   * the answer, and on some models it is most of the wait. */
  it("separates thinking from writing when the provider declares it", () => {
    const line = usageLine("transform", 80_000, {
      inputTokens: 3_000,
      outputTokens: 1_100,
      reasoningTokens: 4_400,
    });

    expect(line).toContain("reasoning 4400");
    expect(line).toContain("80%");
  });

  it("says nothing about reasoning when the provider reports none", () => {
    expect(usageLine("caret", 1_000, { outputTokens: 10 })).not.toContain("reasoning");
  });

  /** A provider that reports no usage at all still has a duration worth having:
   * a line saying "we waited 90s and were told nothing" is the finding. */
  it("still reports the wait when nothing was counted", () => {
    const line = usageLine("caret", 90_000, {});

    expect(line).toContain("90.0s");
    expect(line).toContain("no usage reported");
  });

  /**
   * Whether the provider is reusing the prompt prefix is the one thing that
   * decides if the format contract still costs anything on the second call.
   * Unmeasured, it is a belief.
   */
  it("says how much of the prompt the provider had already seen", () => {
    const line = usageLine("passage", 2_000, { inputTokens: 2_400, cachedTokens: 2_100 });

    expect(line).toContain("in 2400");
    expect(line).toContain("cached 2100");
    expect(line).toContain("88%");
  });

  it("says nothing about caching when the provider reports none", () => {
    expect(usageLine("passage", 1_000, { inputTokens: 500 })).not.toContain("cached");
  });

  it("does not divide by an input of zero", () => {
    expect(usageLine("passage", 1_000, { inputTokens: 0, cachedTokens: 0 })).not.toContain("NaN");
  });

  it("does not divide by a duration of zero", () => {
    expect(usageLine("caret", 0, { outputTokens: 5 })).not.toContain("Infinity");
  });
});
