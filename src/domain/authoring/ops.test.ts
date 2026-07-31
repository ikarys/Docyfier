import { describe, expect, it } from "vitest";
import { applyOps, coveredBlocks, parseOps, type DocOp } from "./ops";

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
      /needs a non-empty "blocks" string/,
    );
    expect(() => parseOps([{ op: "insert_after", index: 0, blocks: "" }], 1)).toThrow(
      /needs a non-empty "blocks" string/,
    );
  });

  it("keeps a delete free of any blocks field", () => {
    expect(parseOps([{ op: "delete", index: 1 }], 2)).toEqual([
      { op: "delete", index: 1 },
    ]);
  });

  it("returns the payload operations unchanged", () => {
    expect(parseOps([{ op: "replace", index: 0, blocks: "A" }], 1)).toEqual([
      { op: "replace", index: 0, through: 0, blocks: "A" },
    ]);
  });

  /**
   * Consolidating is what a layout pass does: three loose paragraphs become one
   * card grid. Spelled as a replace plus two deletes, no rule can tell that
   * apart from throwing two blocks away — so a replace says how far it reaches
   * and the whole merge is one operation.
   */
  it("lets a replace reach across several blocks", () => {
    expect(parseOps([{ op: "replace", index: 0, through: 2, blocks: "A" }], 3)).toEqual([
      { op: "replace", index: 0, through: 2, blocks: "A" },
    ]);
  });

  it("refuses a span that ends before it starts or runs off the document", () => {
    expect(() => parseOps([{ op: "replace", index: 2, through: 1, blocks: "A" }], 3)).toThrow(
      /"through"/,
    );
    expect(() => parseOps([{ op: "replace", index: 0, through: 3, blocks: "A" }], 3)).toThrow(
      /"through"/,
    );
  });

  it("keeps a span off the operations that cannot carry one", () => {
    expect(parseOps([{ op: "insert_after", index: 0, through: 1, blocks: "A" }], 2)).toEqual([
      { op: "insert_after", index: 0, blocks: "A" },
    ]);
  });
});

describe("coveredBlocks", () => {
  it("hands back every block an operation stands in for", () => {
    expect(coveredBlocks({ op: "replace", index: 0, through: 1, blocks: [C] }, [A, B, C])).toEqual([
      A,
      B,
    ]);
  });

  it("hands back the one block of an operation that reaches no further", () => {
    expect(coveredBlocks({ op: "delete", index: 1 }, [A, B, C])).toEqual([B]);
  });
});

describe("applyOps", () => {
  it("replaces one block with several", () => {
    const out = applyOps(doc(A, B), [{ op: "replace", index: 0, through: 0, blocks: [B, C] }]);
    expect(out.content).toEqual([B, C, B]);
  });

  it("swallows the whole span a replace reaches across", () => {
    const out = applyOps(doc(A, B, C), [{ op: "replace", index: 0, through: 1, blocks: [C] }]);
    expect(out.content).toEqual([C, C]);
  });

  it("inserts after the addressed block", () => {
    const out = applyOps(doc(A, B), [{ op: "insert_after", index: 0, blocks: [C] }]);
    expect(out.content).toEqual([A, C, B]);
  });

  it("resolves every index against the original document, not the running one", () => {
    const ops: DocOp[] = [
      { op: "delete", index: 0 },
      { op: "replace", index: 2, through: 2, blocks: [A] },
    ];
    expect(applyOps(doc(A, B, C), ops).content).toEqual([B, A]);
  });

  it("parks an insertion beyond the target before a replace disturbs it", () => {
    const ops: DocOp[] = [
      { op: "insert_after", index: 1, blocks: [C] },
      { op: "replace", index: 1, through: 1, blocks: [A] },
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
