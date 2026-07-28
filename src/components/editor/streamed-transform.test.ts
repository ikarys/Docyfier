import { describe, expect, it, vi } from "vitest";
import { readTransformStream } from "./streamed-transform";

/** An NDJSON body, delivered in the chunks a test asks for. */
function body(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

const OPS = [
  '{"op":{"op":"delete","index":0}}\n',
  '{"op":{"op":"delete","index":1}}\n',
  '{"done":true,"ops":2,"skipped":0}\n',
];

describe("readTransformStream", () => {
  it("collects the operations into one outcome to apply", async () => {
    const result = await readTransformStream(body(...OPS), () => {});
    expect(result).toEqual({
      outcome: {
        kind: "ops",
        ops: [
          { op: "delete", index: 0 },
          { op: "delete", index: 1 },
        ],
      },
      error: null,
    });
  });

  it("reports progress as the operations arrive, before anything is applied", async () => {
    const seen: number[] = [];
    await readTransformStream(body(...OPS), (ops) => seen.push(ops));
    expect(seen).toEqual([1, 2]);
  });

  it("survives a record split across two chunks", async () => {
    const result = await readTransformStream(
      body('{"op":{"op":"delete","in', 'dex":7}}\n{"done":true,"ops":1,"skipped":0}\n'),
      () => {},
    );
    expect(result.outcome).toEqual({ kind: "ops", ops: [{ op: "delete", index: 7 }] });
  });

  it("takes the whole document a model answered instead", async () => {
    const result = await readTransformStream(
      body('{"doc":{"type":"doc","content":[]}}\n{"done":true,"ops":0,"skipped":0}\n'),
      () => {},
    );
    expect(result.outcome).toEqual({ kind: "doc", content: { type: "doc", content: [] } });
  });

  it("hands back the failure the stream reported, with what arrived before it", async () => {
    const result = await readTransformStream(
      body('{"op":{"op":"delete","index":0}}\n{"error":"rate limited","ops":1}\n'),
      () => {},
    );
    expect(result.error).toBe("rate limited");
    expect(result.outcome).toEqual({ kind: "ops", ops: [{ op: "delete", index: 0 }] });
  });

  it("ignores the beats that only keep the connection open", async () => {
    const progress = vi.fn();
    const result = await readTransformStream(
      body('{"beat":true}\n{"beat":true}\n{"done":true,"ops":0,"skipped":0}\n'),
      progress,
    );
    expect(progress).not.toHaveBeenCalled();
    expect(result.outcome).toEqual({ kind: "ops", ops: [] });
  });

  it("calls a stream that ended without a verdict a failure", async () => {
    const result = await readTransformStream(body('{"op":{"op":"delete","index":0}}\n'), () => {});
    expect(result.error).toBeTruthy();
  });
});
