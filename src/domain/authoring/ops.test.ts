import { describe, expect, it } from "vitest";
import { applyOps, parseOps, type DocOp } from "./ops";

const A = { type: "paragraph", content: [{ type: "text", text: "A" }] };
const B = { type: "paragraph", content: [{ type: "text", text: "B" }] };
const C = { type: "paragraph", content: [{ type: "text", text: "C" }] };
const doc = (...blocks: object[]) => ({ type: "doc", content: blocks });

describe("parseOps", () => {
  it("rejects anything that is not an array of operations", () => {
    expect(() => parseOps({ op: "delete", index: 0 }, 1)).toThrow(
      /Expected a JSON array/,
    );
    expect(() => parseOps(["delete"], 1)).toThrow(/Operation 0 is not an object/);
  });

  it("rejects an operation the applier does not implement", () => {
    expect(() => parseOps([{ op: "move", index: 0 }], 1)).toThrow(/unknown "op"/);
  });

  it("rejects an index outside the document, so no op can be partially applied", () => {
    expect(() => parseOps([{ op: "delete", index: 3 }], 3)).toThrow(/outside 0\.\.2/);
    expect(() => parseOps([{ op: "delete", index: -1 }], 3)).toThrow(/outside 0\.\.2/);
    expect(() => parseOps([{ op: "delete", index: 1.5 }], 3)).toThrow(/outside 0\.\.2/);
  });

  it("requires blocks on the operations that carry a payload", () => {
    expect(() => parseOps([{ op: "replace", index: 0 }], 1)).toThrow(
      /needs a non-empty "blocks" array/,
    );
    expect(() => parseOps([{ op: "insert_after", index: 0, blocks: [] }], 1)).toThrow(
      /needs a non-empty "blocks" array/,
    );
  });

  it("keeps a delete free of any blocks field", () => {
    expect(parseOps([{ op: "delete", index: 1 }], 2)).toEqual([
      { op: "delete", index: 1 },
    ]);
  });

  it("returns the payload operations unchanged", () => {
    expect(parseOps([{ op: "replace", index: 0, blocks: [A] }], 1)).toEqual([
      { op: "replace", index: 0, blocks: [A] },
    ]);
  });
});

describe("applyOps", () => {
  it("replaces one block with several", () => {
    const out = applyOps(doc(A, B), [{ op: "replace", index: 0, blocks: [B, C] }]);
    expect(out.content).toEqual([B, C, B]);
  });

  it("inserts after the addressed block", () => {
    const out = applyOps(doc(A, B), [{ op: "insert_after", index: 0, blocks: [C] }]);
    expect(out.content).toEqual([A, C, B]);
  });

  it("resolves every index against the original document, not the running one", () => {
    const ops: DocOp[] = [
      { op: "delete", index: 0 },
      { op: "replace", index: 2, blocks: [A] },
    ];
    expect(applyOps(doc(A, B, C), ops).content).toEqual([B, A]);
  });

  it("parks an insertion beyond the target before a replace disturbs it", () => {
    const ops: DocOp[] = [
      { op: "insert_after", index: 1, blocks: [C] },
      { op: "replace", index: 1, blocks: [A] },
    ];
    expect(applyOps(doc(A, B, C), ops).content).toEqual([A, A, C, C]);
  });

  it("leaves an empty paragraph behind when everything is deleted", () => {
    const out = applyOps(doc(A), [{ op: "delete", index: 0 }]);
    expect(out.content).toEqual([{ type: "paragraph" }]);
  });

  it("does not mutate the document it was given", () => {
    const before = doc(A, B);
    applyOps(before, [{ op: "delete", index: 0 }]);
    expect(before.content).toEqual([A, B]);
  });
});
