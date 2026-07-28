import { describe, expect, it } from "vitest";
import { JsonArrayScanner, firstArray, rootContentArray } from "./stream-json";

const opsOf = (payload: string): string[] =>
  new JsonArrayScanner(firstArray()).push(payload);

describe("JsonArrayScanner over the first array (an op list)", () => {
  it("hands back each operation of a bare array", () => {
    expect(opsOf('[{"op":"delete","index":2},{"op":"replace","index":3,"blocks":[]}]')).toEqual([
      '{"op":"delete","index":2}',
      '{"op":"replace","index":3,"blocks":[]}',
    ]);
  });

  it("emits an operation as soon as it closes, not when the list does", () => {
    const scanner = new JsonArrayScanner(firstArray());
    expect(scanner.push('[{"op":"delete","index":2')).toEqual([]);
    expect(scanner.push("},")).toEqual(['{"op":"delete","index":2}']);
    expect(scanner.finished).toBe(false);
  });

  it("keeps the blocks nested inside an operation whole", () => {
    const op =
      '[{"op":"replace","index":0,"blocks":[{"type":"heading","content":[{"type":"text","text":"Hi"}]}]}]';
    expect(opsOf(op)).toEqual([
      '{"op":"replace","index":0,"blocks":[{"type":"heading","content":[{"type":"text","text":"Hi"}]}]}',
    ]);
  });

  it("finds the list through a markdown fence the model added", () => {
    expect(opsOf('```json\n[{"op":"delete","index":1}]\n```')).toEqual([
      '{"op":"delete","index":1}',
    ]);
  });

  it("is finished once the list closes, and reports nothing for an empty one", () => {
    const scanner = new JsonArrayScanner(firstArray());
    expect(scanner.push("[]")).toEqual([]);
    expect(scanner.finished).toBe(true);
  });

  it("ignores brackets that live inside a string", () => {
    expect(opsOf('[{"op":"replace","index":0,"note":"a ] b [ c"}]')).toEqual([
      '{"op":"replace","index":0,"note":"a ] b [ c"}',
    ]);
  });

  it("produces the same operations however the chunks are cut", () => {
    const payload = '[{"op":"delete","index":0},{"op":"delete","index":1}]';
    const scanner = new JsonArrayScanner(firstArray());
    const ops: string[] = [];
    for (const char of payload) ops.push(...scanner.push(char));
    expect(ops).toEqual(['{"op":"delete","index":0}', '{"op":"delete","index":1}']);
  });
});

describe("JsonArrayScanner over the root content array (a document)", () => {
  it("skips the arrays that open before the one it wants", () => {
    const doc =
      '{"meta":["a","b"],"type":"doc","content":[{"type":"paragraph"}]}';
    expect(new JsonArrayScanner(rootContentArray()).push(doc)).toEqual([
      '{"type":"paragraph"}',
    ]);
  });
});
