import { describe, expect, it } from "vitest";
import { BLOCK_TYPES, currentBlockType } from "./block-type";

/** Stands in for the editor: the names (and heading levels) that are active. */
const active =
  (...names: string[]) =>
  (name: string, attrs?: Record<string, unknown>) =>
    names.includes(attrs?.level ? `${name}${attrs.level}` : name);

describe("the block type under the caret", () => {
  it("is a paragraph when nothing else claims it", () => {
    expect(currentBlockType(active()).label).toBe("Paragraph");
  });

  it("names the heading level, not just 'heading'", () => {
    expect(currentBlockType(active("heading2")).label).toBe("Heading 2");
  });

  it("names lists, quotes and code blocks", () => {
    expect(currentBlockType(active("bulletList")).label).toBe("Bullet list");
    expect(currentBlockType(active("orderedList")).label).toBe("Numbered list");
    expect(currentBlockType(active("blockquote")).label).toBe("Quote");
    expect(currentBlockType(active("codeBlock")).label).toBe("Code block");
  });

  it("prefers the innermost claim: a list inside a quote reads as the list", () => {
    expect(currentBlockType(active("blockquote", "bulletList")).label).toBe(
      "Bullet list",
    );
  });

  it("offers every type it can name, paragraph first", () => {
    expect(BLOCK_TYPES[0].label).toBe("Paragraph");
    expect(BLOCK_TYPES.map((type) => type.label)).toEqual([
      "Paragraph",
      "Heading 1",
      "Heading 2",
      "Heading 3",
      "Bullet list",
      "Numbered list",
      "Quote",
      "Code block",
    ]);
  });

  it("gives every type a distinct id, so a menu can key on it", () => {
    const ids = BLOCK_TYPES.map((type) => type.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
