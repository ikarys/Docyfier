import { describe, expect, it } from "vitest";
import { applyTransform } from "./applied-transform";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const before = { type: "doc", content: [paragraph("first"), paragraph("second")] };

describe("what an AI edit leaves behind", () => {
  it("applies the blocks the model named and leaves the rest untouched", () => {
    const applied = applyTransform(before, {
      kind: "ops",
      ops: [{ op: "replace", index: 0, blocks: [paragraph("rewritten")] }],
    });

    expect(applied.next).toEqual({
      type: "doc",
      content: [paragraph("rewritten"), paragraph("second")],
    });
    expect(applied.blocksEdited).toBe(1);
    expect(applied.changed).toBe(true);
  });

  it("takes a whole document as it comes, naming no blocks", () => {
    const rewritten = { type: "doc", content: [paragraph("all new")] };
    const applied = applyTransform(before, { kind: "doc", content: rewritten });

    expect(applied.next).toEqual(rewritten);
    expect(applied.blocksEdited).toBe(0);
    expect(applied.changed).toBe(true);
  });

  it("calls an edit that changed nothing what it is", () => {
    const replacedWithItself = applyTransform(before, {
      kind: "ops",
      ops: [{ op: "replace", index: 0, blocks: [paragraph("first")] }],
    });
    expect(replacedWithItself.changed).toBe(false);
  });

  it("sees through a document returned identical", () => {
    expect(applyTransform(before, { kind: "doc", content: before }).changed).toBe(false);
  });
});
