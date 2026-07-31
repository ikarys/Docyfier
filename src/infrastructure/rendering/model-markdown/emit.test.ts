import { describe, expect, it } from "vitest";
import { blocksToModelMarkdown } from "./emit";
import { BLOCK_CASES, MARK_CASES } from "./fixtures";
import { para, text } from "./fixtures/nodes";

/**
 * What the emitter chooses, which the round trip cannot see.
 *
 * A version of this file that sent every block through the JSON escape hatch
 * would round-trip perfectly and cost as much as the format it replaces, so the
 * choices are pinned here: markdown when markdown can say it, a directive when
 * only an attribute is in the way, JSON only when nothing else is exact.
 */

const write = (...blocks: Parameters<typeof blocksToModelMarkdown>[0]) =>
  blocksToModelMarkdown(blocks);

describe("what travels as markdown", () => {
  it("writes prose as prose", () => {
    const written = write(
      { type: "heading", attrs: { level: 2 }, content: [text("Titre")] },
      para("Le texte."),
    );
    expect(written).toBe("## Titre\n\nLe texte.");
  });

  it("keeps the words when only an attribute is beyond markdown", () => {
    const written = write({
      type: "paragraph",
      attrs: { textAlign: "center" },
      content: [text("Centré")],
    });
    expect(written).toBe('::: paragraph {"textAlign":"center"}\nCentré\n:::');
  });

  it("closes a directive that has nothing inside it", () => {
    expect(write({ type: "pageBreak" })).toBe("::: pageBreak\n:::");
  });

  it("widens a code span around the backticks it holds", () => {
    const written = write({
      type: "paragraph",
      content: [{ type: "text", text: "a `b` c", marks: [{ type: "code" }] }],
    });
    expect(written).toBe("``a `b` c``");
  });

  it("escapes a line that would otherwise read as a block", () => {
    expect(write(para("# pas un titre"))).toBe("\\# pas un titre");
    expect(write(para("- pas une liste"))).toBe("\\- pas une liste");
  });
});

describe("what falls back to JSON", () => {
  const isJson = (written: string) => written.startsWith("::: json\n");

  it("sends a table with a merged cell back whole", () => {
    const cell = (value: string, attrs?: Record<string, unknown>) => ({
      type: "tableCell",
      ...(attrs ? { attrs } : {}),
      content: [para(value)],
    });
    const written = write({
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [para("A")] }] },
        { type: "tableRow", content: [cell("B", { colspan: 2 })] },
      ],
    });
    expect(isJson(written)).toBe(true);
  });

  it("sends a list back whole when an item holds more than one paragraph", () => {
    const written = write({
      type: "bulletList",
      content: [{ type: "listItem", content: [para("Un"), para("Deux")] }],
    });
    expect(isJson(written)).toBe(true);
  });

  it("sends a block back whole rather than drop a mark it cannot write", () => {
    const written = write({
      type: "paragraph",
      content: [{ type: "text", text: "x", marks: [{ type: "invented" }] }],
    });
    expect(isJson(written)).toBe(true);
  });

  // The escape hatch is exact by construction; what has to stay true is that it
  // is rare, because a format that escapes everything costs what JSON costs.
  it("stays the exception across the whole corpus", () => {
    const blocks = [...BLOCK_CASES, ...MARK_CASES].flatMap((testCase) => testCase.blocks);
    const escapes = write(...blocks).match(/^::: json$/gm)?.length ?? 0;
    expect(escapes).toBeLessThanOrEqual(1);
  });
});
