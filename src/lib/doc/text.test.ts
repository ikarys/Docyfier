import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { docToText } from "./text";

const text = (value: string, marks?: JSONContent["marks"]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: JSONContent[]) => ({ type: "paragraph", content });
const doc = (...content: JSONContent[]) => ({ type: "doc", content });
const item = (value: string) => ({ type: "listItem", content: [p(text(value))] });

/**
 * Plain text is the flavour for destinations that render no markup, so nothing
 * it emits may look like syntax: structure survives as layout only.
 */
describe("docToText", () => {
  it("turns a heading into an uppercase label ending in a colon", () => {
    expect(docToText(doc({ type: "heading", content: [text("Contexte")] }))).toBe(
      "CONTEXTE:",
    );
  });

  it("does not double the colon a heading already carries", () => {
    expect(docToText(doc({ type: "heading", content: [text("Notes:")] }))).toBe(
      "NOTES:",
    );
  });

  it("separates blocks with a blank line", () => {
    expect(docToText(doc(p(text("un")), p(text("deux"))))).toBe("un\n\ndeux");
  });

  it("drops the blocks that render to nothing", () => {
    const out = docToText(
      doc(p(text("un")), { type: "image", attrs: { src: "/x.png" } }, p(text("deux"))),
    );
    expect(out).toBe("un\n\ndeux");
  });

  it("keeps list markers and indents wrapped lines under them", () => {
    expect(docToText(doc({ type: "bulletList", content: [item("un"), item("deux")] })))
      .toBe("- un\n- deux");
    expect(docToText(doc({ type: "orderedList", content: [item("un"), item("deux")] })))
      .toBe("1. un\n2. deux");
  });

  it("indents a code block instead of fencing it", () => {
    const block = { type: "codeBlock", content: [text("a\nb")] };
    expect(docToText(doc(block))).toBe("    a\n    b");
  });

  it("indents a blockquote", () => {
    expect(docToText(doc({ type: "blockquote", content: [p(text("cité"))] }))).toBe(
      "  cité",
    );
  });

  it("renders a horizontal rule as a dashed line", () => {
    expect(docToText(doc({ type: "horizontalRule" }))).toBe("---");
  });

  it("lays a table out as columns separated by pipes", () => {
    const cell = (value: string) => ({ type: "tableCell", content: [p(text(value))] });
    const row = (...values: string[]) => ({
      type: "tableRow",
      content: values.map(cell),
    });
    expect(docToText(doc({ type: "table", content: [row("a", "b"), row("c", "d")] })))
      .toBe("a  |  b\nc  |  d");
  });

  it("spells a link out, since nothing here would make one clickable", () => {
    const link = [{ type: "link", attrs: { href: "https://example.com" } }];
    expect(docToText(doc(p(text("le site", link))))).toBe(
      "le site (https://example.com)",
    );
  });

  it("leaves a self-describing link alone rather than repeating it", () => {
    const href = "https://example.com";
    const link = [{ type: "link", attrs: { href } }];
    expect(docToText(doc(p(text(href, link))))).toBe(href);
  });

  it("drops every other mark: bold text is just text here", () => {
    expect(docToText(doc(p(text("gras", [{ type: "bold" }]))))).toBe("gras");
  });

  it("turns a hard break into a newline", () => {
    expect(docToText(doc(p(text("un"), { type: "hardBreak" }, text("deux"))))).toBe(
      "un\ndeux",
    );
  });

  it("unwraps a callout to the blocks it holds", () => {
    expect(docToText(doc({ type: "callout", content: [p(text("attention"))] }))).toBe(
      "attention",
    );
  });

  it("returns an empty string for an empty document", () => {
    expect(docToText({ type: "doc" })).toBe("");
  });
});
