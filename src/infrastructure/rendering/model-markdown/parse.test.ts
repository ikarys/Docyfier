import { describe, expect, it } from "vitest";
import { modelMarkdownToBlocks } from "./parse";

/**
 * What the parser makes of an answer the emitter would never have written.
 *
 * The round trip only ever hands it back its own output; a model hands it a
 * stray delimiter, a directive nobody declared, a closer it forgot. None of
 * that may lose the words: the reading a person would give is the reading to
 * produce, and the schema still has the last word downstream.
 */

const read = (text: string) => modelMarkdownToBlocks(text);
const first = (text: string) => read(text)[0];

describe("what a model writes instead", () => {
  it("reads stars as italic, though it writes underscores", () => {
    expect(first("*penché*")).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "penché", marks: [{ type: "italic" }] }],
    });
  });

  it("reads a run that is bold and italic at once", () => {
    const marks = (first("***les deux***").content ?? [])[0].marks ?? [];
    expect(marks.map((mark) => mark.type).sort()).toEqual(["bold", "italic"]);
  });

  it("leaves a delimiter that never closes as text", () => {
    expect(first("**pas fermé")).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "**pas fermé" }],
    });
  });

  it("reads a directive that forgot its closing fence", () => {
    expect(first("::: callout\nAttention")).toEqual({
      type: "callout",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Attention" }] }],
    });
  });

  it("keeps the content of a directive nobody declared", () => {
    expect(read("::: inventé\nDes mots.\n:::")).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "Des mots." }] },
    ]);
  });

  it("drops an escape hatch whose JSON is broken rather than store it", () => {
    expect(read("::: json\n{ pas du json\n:::")).toEqual([]);
  });

  it("joins a wrapped line rather than break the sentence", () => {
    expect(first("une phrase\nqui continue")).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "une phrase qui continue" }],
    });
  });

  it("reads a heading that no blank line followed", () => {
    expect(read("## Titre\nLe texte.").map((block) => block.type)).toEqual([
      "heading",
      "paragraph",
    ]);
  });

  it("reads a fence with no language named", () => {
    expect(first("```\nx = 1\n```")).toEqual({
      type: "codeBlock",
      attrs: { language: null },
      content: [{ type: "text", text: "x = 1" }],
    });
  });

  it("reads a list whose lines are not the shape it writes", () => {
    expect(read("+ un\n+ deux")[0].type).toBe("bulletList");
  });

  it("falls back to a paragraph when a list line fits no marker", () => {
    expect(first("- un\npas un item")).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "- un pas un item" }],
    });
  });
});
