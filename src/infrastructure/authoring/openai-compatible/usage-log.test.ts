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

  /**
   * A provider that declares no reasoning tokens is not a provider that did no
   * reasoning. Counting the characters that reached us is the only claim we can
   * make ourselves, and the gap against what was billed as output is the answer
   * to "was the wait the format, or the thinking?".
   */
  it("counts the answer that arrived, so undeclared thinking shows as the gap", () => {
    const line = usageLine("transform", 100_000, { outputTokens: 47_409 }, {
      chars: 21_200,
      thinking: 0,
    });

    expect(line).toContain("answer 21200 chars");
    expect(line).toContain("~5300 tok");
    expect(line).toContain("42109 unwritten");
  });

  it("calls the gap nothing when the answer accounts for the whole output", () => {
    const line = usageLine("caret", 1_000, { outputTokens: 100 }, { chars: 4_000, thinking: 0 });

    expect(line).not.toContain("unwritten");
  });

  it("says nothing about the answer when it was not counted", () => {
    expect(usageLine("caret", 1_000, { outputTokens: 10 })).not.toContain("answer");
  });

  /**
   * A model that spends its whole output budget deliberating and writes nothing
   * is the worst wait the product can produce, and it is invisible: the answer
   * is empty and the provider declares no reasoning. Counting the thinking the
   * SDK streamed is what tells that apart from a provider that hung up.
   */
  it("counts the thinking the model streamed, whatever the provider declares", () => {
    const line = usageLine("transform", 455_000, { outputTokens: 32_769 }, {
      chars: 0,
      thinking: 128_000,
    });

    expect(line).toContain("answer 0 chars");
    expect(line).toContain("thinking 128000 chars");
    expect(line).toContain("~32000 tok");
  });

  it("says nothing about thinking when the model streamed none", () => {
    const line = usageLine("caret", 1_000, { outputTokens: 10 }, { chars: 40, thinking: 0 });

    expect(line).not.toContain("thinking");
  });
});
