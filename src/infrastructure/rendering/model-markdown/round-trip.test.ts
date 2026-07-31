import { describe, expect, it } from "vitest";
import { Node as PMNode } from "@tiptap/pm/model";
import type { DocumentNode } from "@/domain/documents/body";
import { editorSchema, validateDocJson } from "@/infrastructure/editor/schema";
import { blocksToModelMarkdown, modelMarkdownToBlocks } from "./index";
import { BLOCK_CASES, MARK_CASES, type RoundTripCase } from "./fixtures";

/**
 * The rule the model-facing format lives by: a document survives the trip to
 * the model and back unchanged.
 *
 * Deep-equal is stated on the document ProseMirror would build, not on the
 * literal JSON: both sides go through the schema, so an attribute a fixture
 * leaves at its default is not a difference, while one the format loses is.
 */

const ALL_CASES = [...BLOCK_CASES, ...MARK_CASES];

/** The blocks as the editor would store them, defaults filled in. */
function asStored(blocks: DocumentNode[]): DocumentNode[] {
  const doc = PMNode.fromJSON(editorSchema, { type: "doc", content: blocks }).toJSON();
  return doc.content ?? [];
}

function typesUsed(node: DocumentNode, into: Set<string>): Set<string> {
  if (node.type) into.add(node.type);
  for (const mark of node.marks ?? []) into.add(mark.type);
  for (const child of node.content ?? []) typesUsed(child, into);
  return into;
}

function coveredNames(): Set<string> {
  const names = new Set<string>();
  for (const { blocks } of ALL_CASES) for (const block of blocks) typesUsed(block, names);
  return names;
}

describe("the fixtures", () => {
  // A fixture the schema rejects would let a broken expectation pass as a
  // format failure, so it is checked before anything is asked of the format.
  it.each(ALL_CASES)("$name is a document the editor accepts", ({ blocks }: RoundTripCase) => {
    expect(() => validateDocJson({ type: "doc", content: blocks })).not.toThrow();
  });

  // The list is read off the schema rather than typed out: a node or a mark
  // added to the editor and forgotten here fails, instead of quietly shipping
  // a block the model can neither read nor write.
  it("covers every node type the editor ships", () => {
    const covered = coveredNames();
    const nodes = Object.keys(editorSchema.nodes).filter((name) => name !== "doc");
    expect(nodes.filter((name) => !covered.has(name))).toEqual([]);
  });

  it("covers every mark the editor ships", () => {
    const covered = coveredNames();
    const marks = Object.keys(editorSchema.marks);
    expect(marks.filter((name) => !covered.has(name))).toEqual([]);
  });
});

describe("body → model markdown → body", () => {
  it.each(BLOCK_CASES)("keeps $name", ({ blocks }: RoundTripCase) => {
    const back = modelMarkdownToBlocks(blocksToModelMarkdown(blocks));
    expect(asStored(back)).toEqual(asStored(blocks));
  });

  it.each(MARK_CASES)("keeps $name", ({ blocks }: RoundTripCase) => {
    const back = modelMarkdownToBlocks(blocksToModelMarkdown(blocks));
    expect(asStored(back)).toEqual(asStored(blocks));
  });

  it("keeps a document made of every fixture at once", () => {
    const blocks = ALL_CASES.flatMap((testCase) => testCase.blocks);
    const back = modelMarkdownToBlocks(blocksToModelMarkdown(blocks));
    expect(asStored(back)).toEqual(asStored(blocks));
  });

  it("costs less than the JSON it replaces", () => {
    const blocks = ALL_CASES.flatMap((testCase) => testCase.blocks);
    const json = JSON.stringify({ type: "doc", content: blocks });
    // The measured tax is ×4.4 the visible text; the target is about ×1.2.
    // Characters stand in for tokens here — a test may not call a tokenizer,
    // and the ratio between the two formats is what the budget is about.
    expect(blocksToModelMarkdown(blocks).length).toBeLessThan(json.length / 2);
  });
});
