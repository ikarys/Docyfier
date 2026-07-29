import { describe, expect, it } from "vitest";
import { decidePaste } from "./paste-conversion";

describe("deciding what pasted text is", () => {
  it("reads a tab-separated grid as a table, first row as its header", () => {
    const decision = decidePaste("Region\tRevenue\nEMEA\t120\nAPAC\t80");

    expect(decision).toEqual({
      kind: "table",
      rows: [
        ["Region", "Revenue"],
        ["EMEA", "120"],
        ["APAC", "80"],
      ],
    });
  });

  it("reads a URL that names a picture as an image", () => {
    expect(decidePaste("https://cdn.example.com/a.png")).toEqual({
      kind: "image",
      src: "https://cdn.example.com/a.png",
    });
    expect(decidePaste("  https://cdn.example.com/a.JPG?v=2  ")).toEqual({
      kind: "image",
      src: "https://cdn.example.com/a.JPG?v=2",
    });
  });

  it("leaves a page URL a link, and a sentence about a png a sentence", () => {
    expect(decidePaste("https://example.com/article")).toBeNull();
    expect(decidePaste("see https://example.com/a.png")).toBeNull();
    expect(decidePaste("ftp://example.com/a.png")).toBeNull();
  });

  it("refuses a ragged grid: two rows of different widths are not a table", () => {
    expect(decidePaste("a\tb\nc")).toBeNull();
  });

  it("refuses a single line, however many tabs it holds", () => {
    expect(decidePaste("a\tb\tc")).toBeNull();
  });

  it("pads nothing and trims each cell", () => {
    expect(decidePaste("a \t b\nc\td")).toEqual({
      kind: "table",
      rows: [
        ["a", "b"],
        ["c", "d"],
      ],
    });
  });

  it("reads headings, lists, quotes and fences as markdown", () => {
    for (const source of [
      "# Title\n\nbody",
      "- one\n- two",
      "1. one\n2. two",
      "> quoted\n> again",
      "```ts\nconst a = 1;\n```",
      "| a | b |\n| --- | --- |\n| 1 | 2 |",
    ]) {
      expect(decidePaste(source)).toEqual({ kind: "markdown", source });
    }
  });

  it("reads inline markdown only when it spans more than one line", () => {
    expect(decidePaste("**bold**")).toBeNull();
    expect(decidePaste("a **bold** word\n\nand another")).toEqual({
      kind: "markdown",
      source: "a **bold** word\n\nand another",
    });
  });

  it("leaves plain prose to the editor", () => {
    expect(decidePaste("Just a sentence, pasted from somewhere.")).toBeNull();
    expect(decidePaste("Two lines\nof plain text")).toBeNull();
  });

  it("leaves nothing to do for empty or blank text", () => {
    expect(decidePaste("")).toBeNull();
    expect(decidePaste("   \n  ")).toBeNull();
  });

  it("does not mistake a hyphenated sentence for a list", () => {
    expect(decidePaste("well-known issue\nanother-one here")).toBeNull();
  });
});
