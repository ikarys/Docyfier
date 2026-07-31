import { describe, expect, it } from "vitest";
import { REASONING_EFFORTS } from "@/domain/configuration/ai-provider";
import { effortChoices } from "./reasoning-labels";

/**
 * Every thinking setting is readable, and says what choosing it does.
 *
 * "off" was added to the domain list and arrived on the settings page as the
 * bare word "off". A value nobody can read is a value nobody picks — and this
 * was the one that made a stalling provider usable again.
 */
describe("the thinking settings a person picks from", () => {
  it("offers every value the domain allows, in that order", () => {
    expect(effortChoices().map((choice) => choice.value)).toEqual([...REASONING_EFFORTS]);
  });

  it("gives each one a label that is not its own identifier", () => {
    for (const choice of effortChoices()) {
      expect(choice.label).not.toBe(choice.value);
      expect(choice.hint.trim()).not.toBe("");
    }
  });

  /** The one a reader reaches for when nothing answers has to say so. */
  it("tells the reader when to turn it off", () => {
    const off = effortChoices().find((choice) => choice.value === "off");
    expect(off?.hint).toMatch(/stall|hang/i);
  });
});
