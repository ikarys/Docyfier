import { describe, expect, it } from "vitest";
import { parseLayoutPlan } from "./layout-plan";

describe("parseLayoutPlan", () => {
  it("reads the spans the model chose", () => {
    expect(parseLayoutPlan([{ from: 0, through: 2, as: "cardGrid" }], 5)).toEqual([
      { from: 0, through: 2, as: "cardGrid" },
    ]);
  });

  it("lets an intent name a single block", () => {
    expect(parseLayoutPlan([{ from: 3, as: "callout" }], 5)).toEqual([
      { from: 3, through: 3, as: "callout" },
    ]);
  });

  it("refuses an answer that is not a list of intents", () => {
    expect(() => parseLayoutPlan({ from: 0, as: "callout" }, 3)).toThrow(/list/i);
    expect(() => parseLayoutPlan(["cardGrid"], 3)).toThrow(/Intent 0/);
  });

  /** A block the editor cannot draw is not a plan, it is a wish. */
  it("refuses a block the layout vocabulary does not name", () => {
    expect(() => parseLayoutPlan([{ from: 0, as: "carousel" }], 3)).toThrow(/"as"/);
  });

  it("refuses a span outside the document it was shown", () => {
    expect(() => parseLayoutPlan([{ from: 0, through: 3, as: "callout" }], 3)).toThrow(/span/i);
    expect(() => parseLayoutPlan([{ from: 2, through: 1, as: "callout" }], 3)).toThrow(/span/i);
    expect(() => parseLayoutPlan([{ from: -1, as: "callout" }], 3)).toThrow(/span/i);
  });

  /**
   * Two intents over the same block would become two operations replacing
   * overlapping ranges, and the second would land on blocks the first had
   * already swallowed. Kept in reading order, the earlier one wins: it is the
   * one whose span the model committed to first.
   */
  it("drops an intent that reaches into one already claimed", () => {
    const plan = parseLayoutPlan(
      [
        { from: 0, through: 2, as: "cardGrid" },
        { from: 2, through: 4, as: "statRow" },
        { from: 5, through: 6, as: "timeline" },
      ],
      8,
    );

    expect(plan).toEqual([
      { from: 0, through: 2, as: "cardGrid" },
      { from: 5, through: 6, as: "timeline" },
    ]);
  });

  it("orders the plan by where it touches the document", () => {
    const plan = parseLayoutPlan(
      [
        { from: 4, as: "callout" },
        { from: 1, as: "statRow" },
      ],
      6,
    );

    expect(plan.map((intent) => intent.from)).toEqual([1, 4]);
  });

  it("reads an empty plan as a document that deserved nothing", () => {
    expect(parseLayoutPlan([], 4)).toEqual([]);
  });
});
