import { describe, expect, it } from "vitest";
import { emptyBody } from "./body";
import { MAX_TITLE, UNTITLED, copyOf, deriveTitle, titleOverride } from "./title";

const text = (value: string) => ({ type: "text", text: value });
const heading = (value: string, level = 1) => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});
const p = (value: string) => ({ type: "paragraph", content: [text(value)] });
const doc = (...content: object[]) => ({ type: "doc", content });

/** The title follows the content until a rename freezes it. */
describe("deriveTitle", () => {
  it("takes the first heading", () => {
    expect(deriveTitle(doc(heading("Rapport annuel"), p("corps")))).toBe(
      "Rapport annuel",
    );
  });

  it("takes the heading the cover carries", () => {
    const cover = { type: "docCover", content: [heading("Le vrai titre")] };
    expect(deriveTitle(doc(cover, p("corps")))).toBe("Le vrai titre");
  });

  it("concatenates the inline content of a heading, marks and all", () => {
    const rich = {
      type: "heading",
      content: [text("Rapport "), { type: "text", text: "2026", marks: [{ type: "bold" }] }],
    };
    expect(deriveTitle(doc(rich))).toBe("Rapport 2026");
  });

  it("falls back to the first text when there is no heading", () => {
    expect(deriveTitle(doc(p("Une note rapide")))).toBe("Une note rapide");
  });

  it("skips the blocks that hold nothing but whitespace", () => {
    expect(deriveTitle(doc({ type: "paragraph" }, p("   "), p("Enfin")))).toBe("Enfin");
  });

  it("caps a title taken from prose — the list needs a label, not an excerpt", () => {
    expect(deriveTitle(doc(p("a".repeat(200))))).toHaveLength(80);
  });

  it("does not cap a heading, whose length the user chose", () => {
    expect(deriveTitle(doc(heading("a".repeat(200))))).toHaveLength(200);
  });

  it("names a document that says nothing about itself", () => {
    expect(deriveTitle(emptyBody())).toBe(UNTITLED);
    expect(deriveTitle({ type: "doc" })).toBe(UNTITLED);
    expect(deriveTitle(doc(heading("   ")))).toBe(UNTITLED);
  });
});

describe("titleOverride", () => {
  it("trims what the user typed", () => {
    expect(titleOverride("  Rapport  ")).toBe("Rapport");
  });

  it("reads an empty field as 'let the content name it again'", () => {
    expect(titleOverride("")).toBeNull();
    expect(titleOverride("   ")).toBeNull();
  });

  it("cuts an over-long rename rather than refusing it", () => {
    expect(titleOverride("a".repeat(500))).toHaveLength(MAX_TITLE);
  });
});

describe("copyOf", () => {
  it("names a copy after its source", () => {
    expect(copyOf("Rapport annuel")).toBe("Copy of Rapport annuel");
  });

  it("keeps a copy of an already-long title within the stored length", () => {
    expect(copyOf("a".repeat(MAX_TITLE))).toHaveLength(MAX_TITLE);
  });
});
