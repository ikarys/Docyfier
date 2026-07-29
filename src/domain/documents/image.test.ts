import { describe, expect, it } from "vitest";
import { clampImageWidth, imageAlignment, imageRowSizes, widthForAlignment } from "./image";

describe("imageRowSizes", () => {
  it("makes a single row of a batch a row can hold", () => {
    expect(imageRowSizes(2)).toEqual([2]);
    expect(imageRowSizes(4)).toEqual([4]);
  });

  it("leaves one image alone: one picture is not a gallery", () => {
    expect(imageRowSizes(0)).toEqual([]);
    expect(imageRowSizes(1)).toEqual([]);
  });

  it("splits a longer batch as evenly as it can, never leaving a widow", () => {
    expect(imageRowSizes(5)).toEqual([3, 2]);
    expect(imageRowSizes(7)).toEqual([4, 3]);
    expect(imageRowSizes(9)).toEqual([3, 3, 3]);
  });
});

describe("clampImageWidth", () => {
  it("stores whole percents, since half a percent of a column is not a size", () => {
    expect(clampImageWidth(42.4)).toBe(42);
    expect(clampImageWidth(42.6)).toBe(43);
  });

  it("keeps an image between a thumbnail and the column it sits in", () => {
    expect(clampImageWidth(2)).toBe(10);
    expect(clampImageWidth(140)).toBe(100);
  });
});

describe("imageAlignment", () => {
  it("keeps a placement the document knows", () => {
    expect(imageAlignment("left")).toBe("left");
    expect(imageAlignment("full")).toBe("full");
  });

  it("centres anything else, so a hand-edited document still lays out", () => {
    expect(imageAlignment("middle")).toBe("center");
    expect(imageAlignment(undefined)).toBe("center");
    expect(imageAlignment(null)).toBe("center");
  });
});

describe("widthForAlignment", () => {
  it("narrows an image the writer sends to the side, so the text has room to flow", () => {
    expect(widthForAlignment(100, "left")).toBe(50);
    expect(widthForAlignment(100, "right")).toBe(50);
  });

  it("leaves a width that already leaves room alone", () => {
    expect(widthForAlignment(25, "left")).toBe(25);
    expect(widthForAlignment(50, "right")).toBe(50);
  });

  it("keeps the full width a centred or full-bleed image is meant to have", () => {
    expect(widthForAlignment(100, "center")).toBe(100);
    expect(widthForAlignment(100, "full")).toBe(100);
  });
});
