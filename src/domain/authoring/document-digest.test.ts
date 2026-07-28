import { describe, expect, it } from "vitest";
import { digestOf } from "./document-digest";

const text = (value: string) => [{ type: "text", text: value }];
const heading = (level: number, value: string) => ({
  type: "heading",
  attrs: { level },
  content: text(value),
});
const paragraph = (value: string) => ({ type: "paragraph", content: text(value) });

describe("digestOf", () => {
  it("keeps the headings and their level", () => {
    const digest = digestOf({
      type: "doc",
      content: [heading(1, "Outage of March 3"), heading(2, "Impact")],
    });

    expect(digest).toBe("# Outage of March 3\n## Impact");
  });

  it("names the blocks that carry no text of their own", () => {
    const digest = digestOf({
      type: "doc",
      content: [{ type: "chart" }, { type: "statRow" }],
    });

    expect(digest).toBe("[chart]\n[statRow]");
  });

  it("cuts a paragraph down to its opening", () => {
    const digest = digestOf({ type: "doc", content: [paragraph("x".repeat(400))] });

    expect(digest.length).toBeLessThanOrEqual(140);
  });

  it("reads the top of the document, not all of it", () => {
    const content = Array.from({ length: 60 }, (_, i) => heading(2, `Section ${i}`));

    expect(digestOf({ type: "doc", content }).split("\n")).toHaveLength(24);
  });

  it("says nothing about an empty document", () => {
    expect(digestOf({ type: "doc", content: [] })).toBe("");
    expect(digestOf({ type: "doc" })).toBe("");
  });
});
