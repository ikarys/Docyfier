import { describe, expect, it } from "vitest";
import { widthFromDrag, type ImageDrag } from "./resize";

const drag = (over: Partial<ImageDrag> = {}): ImageDrag => ({
  originX: 100,
  originWidth: 50,
  columnWidth: 600,
  alignment: "left",
  ...over,
});

describe("widthFromDrag", () => {
  it("widens by the share of the column the pointer crossed", () => {
    // 60px of a 600px column is a tenth of it.
    expect(widthFromDrag(drag({ originWidth: 30 }), 160)).toBe(30 + 10);
    expect(widthFromDrag(drag({ originWidth: 40 }), 40)).toBe(40 - 10);
  });

  it("grows a centred image twice as fast, since it gains on both sides", () => {
    expect(widthFromDrag(drag({ alignment: "center" }), 160)).toBe(50 + 20);
  });

  it("stops where the document would rather it did not go", () => {
    expect(widthFromDrag(drag({ alignment: "center" }), 1000)).toBe(100);
    expect(widthFromDrag(drag(), -1000)).toBe(10);
  });

  it("never lets a wrapped image take the whole column", () => {
    expect(widthFromDrag(drag({ alignment: "right", originWidth: 50 }), 400)).toBe(50);
  });

  it("survives a column it was handed no width for", () => {
    expect(widthFromDrag(drag({ columnWidth: 0 }), 100)).toBe(50);
  });
});
