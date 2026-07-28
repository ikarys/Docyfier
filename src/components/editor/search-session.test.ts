import { describe, expect, it } from "vitest";
import { EMPTY_SEARCH, searchReducer, type SearchSession } from "./search-session";

const withMatches = (count: number, active = 0): SearchSession => ({
  ...EMPTY_SEARCH,
  query: "a",
  matches: Array.from({ length: count }, (_, index) => ({
    from: index * 10,
    to: index * 10 + 1,
  })),
  active,
});

describe("a search session", () => {
  it("has no active match until something is found", () => {
    expect(EMPTY_SEARCH.active).toBe(-1);
  });

  it("lands on the first match as soon as matches arrive", () => {
    const session = searchReducer(EMPTY_SEARCH, {
      type: "found",
      matches: [{ from: 1, to: 2 }],
    });

    expect(session.active).toBe(0);
  });

  it("wraps forward from the last match to the first", () => {
    expect(searchReducer(withMatches(3, 2), { type: "step", by: 1 }).active).toBe(0);
  });

  it("wraps backward from the first match to the last", () => {
    expect(searchReducer(withMatches(3, 0), { type: "step", by: -1 }).active).toBe(2);
  });

  it("steps nowhere when nothing was found", () => {
    expect(searchReducer(EMPTY_SEARCH, { type: "step", by: 1 }).active).toBe(-1);
  });

  it("keeps the active match in range when the document loses occurrences", () => {
    const shrunk = searchReducer(withMatches(5, 4), {
      type: "found",
      matches: [{ from: 1, to: 2 }],
    });

    expect(shrunk.active).toBe(0);
  });

  it("stays on the same occurrence while the document is edited elsewhere", () => {
    const session = searchReducer(withMatches(4, 2), {
      type: "found",
      matches: withMatches(4).matches,
    });

    expect(session.active).toBe(2);
  });

  it("forgets the active match when the query stops matching anything", () => {
    expect(searchReducer(withMatches(3, 1), { type: "found", matches: [] }).active).toBe(
      -1,
    );
  });

  it("searches again from the top when the query changes", () => {
    const session = searchReducer(withMatches(3, 2), { type: "query", value: "b" });

    expect(session).toMatchObject({ query: "b", active: -1, matches: [] });
  });

  it("toggles case sensitivity and whole-word without touching the query", () => {
    const sensitive = searchReducer(withMatches(2), { type: "toggle", option: "caseSensitive" });

    expect(sensitive).toMatchObject({ caseSensitive: true, query: "a" });
    expect(
      searchReducer(sensitive, { type: "toggle", option: "caseSensitive" }).caseSensitive,
    ).toBe(false);
    expect(searchReducer(sensitive, { type: "toggle", option: "wholeWord" }).wholeWord).toBe(
      true,
    );
  });

  it("drops its matches when an option changes, since they were found under the old one", () => {
    expect(
      searchReducer(withMatches(3, 1), { type: "toggle", option: "wholeWord" }),
    ).toMatchObject({ matches: [], active: -1 });
  });

  it("closing forgets everything but what was typed", () => {
    const closed = searchReducer(
      { ...withMatches(3, 1), replacement: "b" },
      { type: "close" },
    );

    expect(closed).toMatchObject({ query: "a", replacement: "b", matches: [], active: -1 });
  });
});
