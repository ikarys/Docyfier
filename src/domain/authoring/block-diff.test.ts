import { describe, expect, it } from "vitest";
import { changedBlocks } from "./block-diff";

const p = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const doc = (...texts: string[]) => ({ type: "doc", content: texts.map(p) });

/** One mark per block of `after` — the marks describe what the user now sees. */
describe("changedBlocks", () => {
  it("marks an untouched document entirely same", () => {
    expect(changedBlocks(doc("a", "b"), doc("a", "b"))).toEqual(["same", "same"]);
  });

  it("marks an edited block changed and leaves its neighbours alone", () => {
    expect(changedBlocks(doc("a", "b", "c"), doc("a", "B!", "c"))).toEqual([
      "same",
      "changed",
      "same",
    ]);
  });

  it("marks an extra block inserted rather than shifting everything below", () => {
    expect(changedBlocks(doc("a", "b"), doc("a", "b", "c"))).toEqual([
      "same",
      "same",
      "inserted",
    ]);
    expect(changedBlocks(doc("a", "b"), doc("a", "new", "b"))).toEqual([
      "same",
      "inserted",
      "same",
    ]);
  });

  it("says nothing about a deleted block, which has no place left in after", () => {
    expect(changedBlocks(doc("a", "b", "c"), doc("a", "c"))).toEqual([
      "same",
      "same",
    ]);
  });

  it("compares by value, so an identical block that moved is still same", () => {
    expect(changedBlocks(doc("a", "b"), doc("b", "a"))).toEqual([
      "same",
      "inserted",
    ]);
  });

  it("treats a whole-document rewrite as changed, then inserted", () => {
    expect(changedBlocks(doc("a"), doc("x", "y"))).toEqual(["changed", "inserted"]);
  });

  it("handles empty documents on either side", () => {
    expect(changedBlocks({ type: "doc" }, doc("a"))).toEqual(["inserted"]);
    expect(changedBlocks(doc("a"), { type: "doc" })).toEqual([]);
  });
});
