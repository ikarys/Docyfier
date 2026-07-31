import { describe, expect, it } from "vitest";
import { blocksToModelMarkdown } from "./emit";
import { BLOCK_CASES, MARK_CASES } from "./fixtures";
import { BlockSplitter, splitBlocks } from "./split-blocks";

/**
 * Where a block ends, read from a finished answer and from one still arriving.
 *
 * The rule that matters most is the last one here: the two readings agree
 * whatever the chunks look like. A stream that split differently from a
 * finished text would insert a broken block into a document the user is
 * already looking at.
 */

/** The whole corpus as one answer — every construct, in one text. */
const CORPUS = blocksToModelMarkdown(
  [...BLOCK_CASES, ...MARK_CASES].flatMap((testCase) => testCase.blocks),
);

/** What the splitter makes of the same text delivered in pieces of `size`. */
function streamed(text: string, size: number): string[] {
  const splitter = new BlockSplitter();
  const blocks: string[] = [];
  for (let at = 0; at < text.length; at += size) {
    blocks.push(...splitter.push(text.slice(at, at + size)));
  }
  blocks.push(...splitter.end());
  return blocks;
}

describe("what a blank line may not cut", () => {
  it("keeps a code fence whole", () => {
    expect(splitBlocks("```ts\nconst a = 1;\n\nconst b = 2;\n```")).toHaveLength(1);
  });

  it("keeps a maths fence whole", () => {
    expect(splitBlocks("$$\na\n\nb\n$$")).toHaveLength(1);
  });

  it("keeps a directive whole, however deep it nests", () => {
    const grid = "::: cardGrid\n::: card\nUn\n\nDeux\n:::\n\n::: card\nTrois\n:::\n:::";
    expect(splitBlocks(grid)).toEqual([grid]);
  });

  it("separates two blocks a blank line does part", () => {
    expect(splitBlocks("# Titre\n\nDu texte.")).toEqual(["# Titre", "Du texte."]);
  });
});

describe("what a stream hands over, and when", () => {
  it("hands a directive over the moment it closes", () => {
    const splitter = new BlockSplitter();
    // No blank line yet: waiting for one would be waiting for the next block.
    expect(splitter.push("::: pageBreak\n:::\n")).toEqual(["::: pageBreak\n:::"]);
  });

  it("keeps the last block until the writing stops", () => {
    const splitter = new BlockSplitter();
    expect(splitter.push("Un.\n\nDeux, sans ligne vide après")).toEqual(["Un."]);
    expect(splitter.end()).toEqual(["Deux, sans ligne vide après"]);
  });

  it("hands back an answer cut short as far as it got", () => {
    const splitter = new BlockSplitter();
    splitter.push("::: callout\nCoupé au milieu");
    expect(splitter.end()).toEqual(["::: callout\nCoupé au milieu"]);
  });

  it("reads the same blocks whatever the chunks were", () => {
    const whole = splitBlocks(CORPUS);
    for (const size of [1, 7, 64, 1000]) {
      expect(streamed(CORPUS, size)).toEqual(whole);
    }
  });
});
