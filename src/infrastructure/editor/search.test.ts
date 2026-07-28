import { describe, expect, it } from "vitest";
import { Transform } from "@tiptap/pm/transform";
import type { Node as PMNode } from "@tiptap/pm/model";
import { findMatches } from "@/domain/documents/text-matches";
import { editorSchema } from "./schema";
import { replaceMatches, searchableBlocks } from "./search";

const paragraph = (text: string) =>
  editorSchema.node("paragraph", null, text ? [editorSchema.text(text)] : []);

const doc = (...content: PMNode[]) => editorSchema.node("doc", null, content);

describe("the searchable text of a document", () => {
  it("reads a paragraph as its text, starting one position inside the node", () => {
    expect(searchableBlocks(doc(paragraph("hello")))).toEqual([{ text: "hello", from: 1 }]);
  });

  it("reads every text block, each from its own position", () => {
    expect(searchableBlocks(doc(paragraph("one"), paragraph("two")))).toEqual([
      { text: "one", from: 1 },
      { text: "two", from: 6 },
    ]);
  });

  it("reads text nested in a layout block, so a card is searchable too", () => {
    const callout = editorSchema.node("callout", null, [paragraph("inside")]);

    expect(searchableBlocks(doc(callout))).toEqual([{ text: "inside", from: 2 }]);
  });

  it("keeps marked text in one run: a bold word does not split the sentence", () => {
    const bold = editorSchema.mark("bold");
    const sentence = editorSchema.node("paragraph", null, [
      editorSchema.text("make it "),
      editorSchema.text("pretty", [bold]),
    ]);

    expect(searchableBlocks(doc(sentence))).toEqual([{ text: "make it pretty", from: 1 }]);
  });

  it("breaks a run at an inline node, so positions after it stay true", () => {
    const broken = editorSchema.node("paragraph", null, [
      editorSchema.text("before"),
      editorSchema.node("hardBreak"),
      editorSchema.text("after"),
    ]);

    expect(searchableBlocks(doc(broken))).toEqual([
      { text: "before", from: 1 },
      { text: "after", from: 8 },
    ]);
  });

  it("skips a block that holds no text", () => {
    expect(searchableBlocks(doc(paragraph("")))).toEqual([]);
  });
});

describe("replacing every match at once", () => {
  it("replaces all occurrences in a single transform, whatever the new length", () => {
    const document = doc(paragraph("save the save"));
    const matches = findMatches(searchableBlocks(document), "save");

    const transform = replaceMatches(new Transform(document), matches, "keep it");

    expect(transform.doc.textContent).toBe("keep it the keep it");
    expect(transform.steps).toHaveLength(2);
  });

  it("replaces across blocks without shifting the ones it has not reached", () => {
    const document = doc(paragraph("alpha"), paragraph("alpha"));
    const matches = findMatches(searchableBlocks(document), "alpha");

    const transform = replaceMatches(new Transform(document), matches, "x");

    expect(transform.doc.child(0).textContent).toBe("x");
    expect(transform.doc.child(1).textContent).toBe("x");
  });

  it("leaves the document alone when nothing was found", () => {
    const document = doc(paragraph("alpha"));

    expect(replaceMatches(new Transform(document), [], "x").steps).toHaveLength(0);
  });
});
