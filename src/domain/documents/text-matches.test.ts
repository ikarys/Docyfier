import { describe, expect, it } from "vitest";
import { findMatches, type SearchableBlock } from "./text-matches";

const block = (text: string, from: number): SearchableBlock => ({ text, from });

describe("finding text in a document", () => {
  it("reports every occurrence at its position in the document", () => {
    const matches = findMatches([block("save the save", 1)], "save");

    expect(matches).toEqual([
      { from: 1, to: 5 },
      { from: 10, to: 14 },
    ]);
  });

  it("counts from each block's own start, so later blocks are not off by one", () => {
    const matches = findMatches([block("alpha", 1), block("alpha", 8)], "alpha");

    expect(matches).toEqual([
      { from: 1, to: 6 },
      { from: 8, to: 13 },
    ]);
  });

  it("ignores case unless the search asks for it", () => {
    const blocks = [block("Save", 1)];

    expect(findMatches(blocks, "save")).toHaveLength(1);
    expect(findMatches(blocks, "save", { caseSensitive: true })).toHaveLength(0);
  });

  it("hands back nothing for a query of only spaces", () => {
    expect(findMatches([block("a b", 1)], "   ")).toEqual([]);
  });

  it("hands back nothing for an empty query", () => {
    expect(findMatches([block("a b", 1)], "")).toEqual([]);
  });

  it("never overlaps two matches", () => {
    expect(findMatches([block("aaaa", 1)], "aa")).toEqual([
      { from: 1, to: 3 },
      { from: 3, to: 5 },
    ]);
  });

  it("never spans two blocks: a phrase split by a paragraph break is not a match", () => {
    expect(findMatches([block("hello", 1), block("world", 8)], "hello world")).toEqual(
      [],
    );
  });

  it("takes the query literally: a regular expression is text, not a pattern", () => {
    expect(findMatches([block("value in c++ code", 1)], "c++")).toEqual([
      { from: 10, to: 13 },
    ]);
    expect(findMatches([block("a.b and axb", 1)], "a.b")).toEqual([
      { from: 1, to: 4 },
    ]);
  });

  it("matches whole words only when asked, so 'form' spares 'format'", () => {
    const blocks = [block("format a form", 1)];

    expect(findMatches(blocks, "form")).toHaveLength(2);
    expect(findMatches(blocks, "form", { wholeWord: true })).toEqual([
      { from: 10, to: 14 },
    ]);
  });

  it("returns matches in reading order, whatever the block order asked", () => {
    const matches = findMatches([block("one", 1), block("one", 6)], "one");

    expect(matches.map((match) => match.from)).toEqual([1, 6]);
  });
});
