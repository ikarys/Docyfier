import { describe, expect, it } from "vitest";
import { readingMinutes } from "./reading-time";

describe("how long a document takes to read", () => {
  it("is nothing at all for an empty document", () => {
    expect(readingMinutes(0)).toBe(0);
  });

  it("rounds up, so a handful of words is still a minute", () => {
    expect(readingMinutes(1)).toBe(1);
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
  });

  it("grows with the document", () => {
    expect(readingMinutes(1_000)).toBe(5);
  });
});
