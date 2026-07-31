import { describe, expect, it } from "vitest";
import { effortFor } from "./thinking";

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
