import { describe, expect, it } from "vitest";
import { SLASH_ITEMS, filterSlashItems } from "./slash-items";

const titlesFor = (query: string) => filterSlashItems(query).map((i) => i.title);

describe("filtering the slash menu", () => {
  it("offers everything until something is typed", () => {
    expect(filterSlashItems("")).toEqual(SLASH_ITEMS);
    expect(filterSlashItems("   ")).toEqual(SLASH_ITEMS);
  });

  it("matches a title however it is cased", () => {
    expect(titlesFor("HEADING 1")).toEqual(["Heading 1"]);
  });

  it("matches on a keyword the title does not contain", () => {
    expect(titlesFor("sommaire")).toEqual(["Table of contents"]);
  });

  it("answers in French as well as English", () => {
    expect(titlesFor("graphique")).toEqual(titlesFor("chart"));
  });

  it("keeps every block sharing a prefix", () => {
    expect(titlesFor("callout")).toEqual([
      "Callout: Note",
      "Callout: Tip",
      "Callout: Warning",
      "Callout: Danger",
    ]);
  });

  it("answers nothing rather than everything when nothing matches", () => {
    expect(filterSlashItems("mermaid")).toEqual([]);
  });
});

describe("the catalogue itself", () => {
  it("has a distinct title per item — the menu keys rows by it", () => {
    const titles = SLASH_ITEMS.map((i) => i.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("keeps keywords lowercase, since the query is lowercased to match them", () => {
    const shouting = SLASH_ITEMS.filter((i) =>
      i.keywords.some((k) => k !== k.toLowerCase()),
    );
    expect(shouting).toEqual([]);
  });
});
