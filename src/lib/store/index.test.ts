import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { deriveTitle, emptyContent } from "./index";

const text = (value: string) => ({ type: "text", text: value });
const heading = (value: string, level = 1) => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});
const p = (value: string) => ({ type: "paragraph", content: [text(value)] });
const doc = (...content: JSONContent[]) => ({ type: "doc", content });

describe("emptyContent", () => {
  it("is a valid document the editor can put a caret in", () => {
    expect(emptyContent()).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("returns a fresh object, so two new documents never share content", () => {
    expect(emptyContent()).not.toBe(emptyContent());
  });
});

/**
 * The title follows the content until a rename freezes it. It has to hold for
 * every shape a document can take, including the ones with no heading at all.
 */
describe("deriveTitle", () => {
  it("takes the first heading", () => {
    expect(deriveTitle(doc(heading("Rapport annuel"), p("corps")))).toBe(
      "Rapport annuel",
    );
  });

  it("takes the first heading whatever its level", () => {
    expect(deriveTitle(doc(heading("Sous-titre", 3)))).toBe("Sous-titre");
  });

  it("looks inside the cover block that carries the title", () => {
    const cover = {
      type: "docCover",
      content: [{ type: "coverLine", content: [text("sur-titre")] }, heading("Le vrai titre")],
    };
    expect(deriveTitle(doc(cover, p("corps")))).toBe("Le vrai titre");
  });

  it("falls back to the first text when the document has no heading", () => {
    expect(deriveTitle(doc(p("Une note rapide")))).toBe("Une note rapide");
  });

  it("skips the empty blocks when falling back to text", () => {
    expect(deriveTitle(doc({ type: "paragraph" }, p("   "), p("Enfin")))).toBe("Enfin");
  });

  it("caps a title derived from prose, which can be a whole paragraph", () => {
    expect(deriveTitle(doc(p("a".repeat(200))))).toHaveLength(80);
  });

  it("does not cap a title the user actually wrote as a heading", () => {
    expect(deriveTitle(doc(heading("a".repeat(200))))).toHaveLength(200);
  });

  it("names an empty document rather than leaving it blank in the list", () => {
    expect(deriveTitle(emptyContent())).toBe("Untitled document");
    expect(deriveTitle({ type: "doc" })).toBe("Untitled document");
    expect(deriveTitle(doc(heading("   ")))).toBe("Untitled document");
  });

  it("concatenates the inline content of a heading, marks and all", () => {
    const rich = {
      type: "heading",
      content: [text("Rapport "), { type: "text", text: "2026", marks: [{ type: "bold" }] }],
    };
    expect(deriveTitle(doc(rich))).toBe("Rapport 2026");
  });
});
