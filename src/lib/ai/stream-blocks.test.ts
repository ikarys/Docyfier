import { describe, expect, it } from "vitest";
import { BlockScanner } from "./stream-blocks";

/** Feed a payload one character at a time — the worst case a stream can produce. */
function scanByChar(payload: string): { blocks: string[]; finished: boolean } {
  const scanner = new BlockScanner();
  const blocks: string[] = [];
  for (const char of payload) blocks.push(...scanner.push(char));
  return { blocks, finished: scanner.finished };
}

const DOC = '{"type":"doc","content":[{"type":"paragraph"},{"type":"heading","attrs":{"level":1}}]}';

describe("BlockScanner", () => {
  it("hands back each block of the root content array", () => {
    expect(new BlockScanner().push(DOC)).toEqual([
      '{"type":"paragraph"}',
      '{"type":"heading","attrs":{"level":1}}',
    ]);
  });

  it("produces the same blocks however the chunks are cut", () => {
    expect(scanByChar(DOC).blocks).toEqual([
      '{"type":"paragraph"}',
      '{"type":"heading","attrs":{"level":1}}',
    ]);
  });

  it("emits a block as soon as it closes, not when the document does", () => {
    const scanner = new BlockScanner();
    expect(scanner.push('{"type":"doc","content":[{"type":"paragraph"')).toEqual([]);
    expect(scanner.push("},")).toEqual(['{"type":"paragraph"}']);
    expect(scanner.finished).toBe(false);
  });

  it("is finished once the content array closes", () => {
    expect(scanByChar(DOC).finished).toBe(true);
    expect(new BlockScanner().finished).toBe(false);
  });

  it("does not mistake a nested content array for the root one", () => {
    const nested =
      '{"type":"doc","content":[{"type":"callout","content":[{"type":"paragraph"}]}]}';
    expect(new BlockScanner().push(nested)).toEqual([
      '{"type":"callout","content":[{"type":"paragraph"}]}',
    ]);
  });

  it("ignores braces and brackets that live inside a string", () => {
    const braces =
      '{"type":"doc","content":[{"type":"text","text":"a { b } c ] d"}]}';
    expect(new BlockScanner().push(braces)).toEqual([
      '{"type":"text","text":"a { b } c ] d"}',
    ]);
  });

  it("handles an escaped quote inside a string", () => {
    const escaped = '{"type":"doc","content":[{"type":"text","text":"say \\"hi\\""}]}';
    expect(new BlockScanner().push(escaped)).toEqual([
      '{"type":"text","text":"say \\"hi\\""}',
    ]);
  });

  it("handles an escaped backslash ending a string", () => {
    const trailing = '{"type":"doc","content":[{"type":"text","text":"path\\\\"}]}';
    expect(new BlockScanner().push(trailing)).toEqual([
      '{"type":"text","text":"path\\\\"}',
    ]);
  });

  it("reports nothing for an empty document", () => {
    const scanner = new BlockScanner();
    expect(scanner.push('{"type":"doc","content":[]}')).toEqual([]);
    expect(scanner.finished).toBe(true);
  });

  it("waits rather than guessing while the preamble is still arriving", () => {
    const scanner = new BlockScanner();
    expect(scanner.push('{"type":"doc","con')).toEqual([]);
    expect(scanner.push('tent":[{"type":"paragraph"}]}')).toEqual([
      '{"type":"paragraph"}',
    ]);
  });
});
