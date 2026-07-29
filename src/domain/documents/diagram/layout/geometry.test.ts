import { describe, expect, it } from "vitest";
import type { DiagramNode } from "../diagram";
import { MAX_BOX_WIDTH, MIN_BOX_WIDTH, uniformBoxSize, wrapLabel } from "./geometry";

const node = (label: string, note?: string): DiagramNode => ({ id: label, label, note });

describe("wrapLabel", () => {
  it("keeps a short label on one line", () => {
    expect(wrapLabel("Review", 120)).toEqual(["Review"]);
  });

  it("breaks on words rather than mid-word", () => {
    expect(wrapLabel("Send the request", 100)).toEqual(["Send the", "request"]);
  });

  it("keeps a word too long for the line rather than dropping it", () => {
    expect(wrapLabel("Antidisestablishmentarianism", 40)).toEqual([
      "Antidisestablishmentarianism",
    ]);
  });

  it("ellipses what will not fit in the lines it is given", () => {
    const lines = wrapLabel("one two three four five six seven eight", 60, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("gives an empty label a line to sit on, so the box still draws", () => {
    expect(wrapLabel("", 120)).toEqual([""]);
    expect(wrapLabel("   ", 120)).toEqual([""]);
  });
});

/**
 * One size for every box: differing widths read as an accident, a single
 * measured size reads as a decision.
 */
describe("uniformBoxSize", () => {
  it("never goes below the minimum, however short the labels", () => {
    expect(uniformBoxSize([node("A"), node("B")]).width).toBe(MIN_BOX_WIDTH);
  });

  it("never goes past the maximum, however long they are", () => {
    expect(uniformBoxSize([node("x".repeat(80))]).width).toBe(MAX_BOX_WIDTH);
  });

  it("measures every box against the widest, not against its own text", () => {
    const together = uniformBoxSize([node("A"), node("A longer label here")]);
    expect(together.width).toBe(uniformBoxSize([node("A longer label here")]).width);
  });

  it("makes room for a note only when one box carries it", () => {
    const plain = uniformBoxSize([node("API"), node("DB")]);
    const noted = uniformBoxSize([node("API"), node("DB", "PostgreSQL")]);
    expect(noted.height).toBeGreaterThan(plain.height);
  });

  it("grows tall enough for a label that wraps", () => {
    const one = uniformBoxSize([node("API")]);
    const two = uniformBoxSize([node("A rather long service name")]);
    expect(two.height).toBeGreaterThan(one.height);
  });
});
