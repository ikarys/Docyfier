import { describe, expect, it } from "vitest";
import { digestOf, outlineOf } from "./document-digest";

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

  /**
   * A later pass asked to amend a diagram has nothing else to go on: the labels
   * are the only trace of the system the document describes.
   */
  it("names a diagram with its boxes", () => {
    const nodes = [{ id: "a", label: "Web app" }, { id: "b", label: "API" }];
    const digest = digestOf({ type: "doc", content: [{ type: "diagram", attrs: { nodes } }] });

    expect(digest).toBe("[diagram: Web app · API]");
  });

  it("falls back to naming a diagram whose boxes it cannot read", () => {
    expect(digestOf({ type: "doc", content: [{ type: "diagram" }] })).toBe("[diagram]");
    expect(digestOf({ type: "doc", content: [{ type: "diagram", attrs: { nodes: "?" } }] })).toBe(
      "[diagram]",
    );
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

describe("outlineOf", () => {
  it("numbers every block, so a plan can address one", () => {
    const outline = outlineOf([heading(1, "Vendors"), paragraph("A costs 120k.")]);

    expect(outline).toBe("0: # Vendors\n1: A costs 120k.");
  });

  /** The digest is what a document is about and stops at two dozen lines. A
   * plan has to see the block it is going to name, however far down it sits. */
  it("keeps every block, however long the document", () => {
    const long = Array.from({ length: 40 }, (_, i) => paragraph(`Block ${i}`));

    expect(outlineOf(long).split("\n")).toHaveLength(40);
  });

  it("names a block that carries no text of its own", () => {
    expect(outlineOf([{ type: "chart" }])).toBe("0: [chart]");
  });
});
