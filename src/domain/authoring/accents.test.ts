import { describe, expect, it } from "vitest";
import { paintAccents } from "./accents";

const card = (accent?: string) => ({
  type: "card",
  ...(accent ? { attrs: { accent } } : {}),
  content: [{ type: "paragraph" }],
});

const grid = (...cards: object[]) => ({
  type: "cardGrid",
  attrs: { cols: cards.length },
  content: cards,
});

const accentsOf = (node: { content?: { attrs?: { accent?: string } }[] }) =>
  (node.content ?? []).map((child) => child.attrs?.accent);

describe("paintAccents", () => {
  it("colors a card grid the model left grey", () => {
    expect(accentsOf(paintAccents(grid(card(), card(), card())))).toEqual([
      "blue",
      "green",
      "purple",
    ]);
  });

  it("treats an explicit none as no choice at all", () => {
    expect(accentsOf(paintAccents(grid(card("none"), card("none"))))).toEqual([
      "blue",
      "green",
    ]);
  });

  it("leaves a grid alone the moment the model chose for itself", () => {
    const chosen = grid(card("red"), card(), card());

    expect(accentsOf(paintAccents(chosen))).toEqual(["red", undefined, undefined]);
  });

  it("cycles rather than running out of colors", () => {
    const many = grid(card(), card(), card(), card(), card());

    expect(accentsOf(paintAccents(many))).toEqual([
      "blue",
      "green",
      "purple",
      "yellow",
      "blue",
    ]);
  });

  it("paints every family that has accented children", () => {
    const timeline = {
      type: "timeline",
      content: [{ type: "timelineItem" }, { type: "timelineItem" }],
    };
    const steps = { type: "stepList", content: [{ type: "step" }] };
    const stats = { type: "statRow", content: [{ type: "stat" }] };

    expect(accentsOf(paintAccents(timeline))).toEqual(["blue", "green"]);
    expect(accentsOf(paintAccents(steps))).toEqual(["blue"]);
    expect(accentsOf(paintAccents(stats))).toEqual(["blue"]);
  });

  it("keeps the attributes a child already carries", () => {
    const stats = {
      type: "statRow",
      content: [{ type: "stat", attrs: { trend: "good", layout: "row" } }],
    };

    expect(paintAccents(stats).content?.[0].attrs).toEqual({
      trend: "good",
      layout: "row",
      accent: "blue",
    });
  });

  it("leaves blocks it knows nothing about untouched", () => {
    const table = { type: "table", content: [{ type: "tableRow" }] };

    expect(paintAccents(table)).toBe(table);
  });
});
