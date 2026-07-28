import { describe, expect, it } from "vitest";
import type { DocOp } from "@/domain/authoring/ops";
import type { DocumentBody } from "@/domain/documents/body";
import type { StreamEvent } from "./stream-heartbeat";
import { transformLines, type ModelPart, type TransformReader } from "./transform-stream";

/** The events a model stream would produce, one text delta per chunk. */
async function* deltas(
  ...chunks: (string | StreamEvent<ModelPart>)[]
): AsyncGenerator<StreamEvent<ModelPart>> {
  for (const chunk of chunks) {
    yield typeof chunk === "string"
      ? { kind: "part", part: { type: "text-delta", text: chunk } }
      : chunk;
  }
}

const reader: TransformReader = {
  op: (raw) => raw as DocOp,
  doc: (text) => JSON.parse(text) as DocumentBody,
};

async function linesOf(
  events: AsyncGenerator<StreamEvent<ModelPart>>,
  over: TransformReader = reader,
): Promise<Record<string, unknown>[]> {
  const lines: Record<string, unknown>[] = [];
  for await (const line of transformLines(events, over)) lines.push(line);
  return lines;
}

describe("transformLines", () => {
  it("emits each operation as it closes, then a terminal count", async () => {
    const lines = await linesOf(
      deltas('[{"op":"delete",', '"index":2},', '{"op":"delete","index":5}]'),
    );
    expect(lines).toEqual([
      { op: { op: "delete", index: 2 } },
      { op: { op: "delete", index: 5 } },
      { done: true, ops: 2, skipped: 0 },
    ]);
  });

  it("passes a beat through, so the connection never falls silent", async () => {
    const lines = await linesOf(deltas("[", { kind: "beat" }, "]"));
    expect(lines).toEqual([{ beat: true }, { done: true, ops: 0, skipped: 0 }]);
  });

  it("drops an operation the reader rejects rather than the whole stream", async () => {
    const strict: TransformReader = {
      op: (raw) => {
        const op = raw as DocOp;
        if (op.index === 99) throw new Error("index 99 is outside the document");
        return op;
      },
      doc: reader.doc,
    };
    const lines = await linesOf(
      deltas('[{"op":"delete","index":99},{"op":"delete","index":1}]'),
      strict,
    );
    expect(lines).toEqual([
      { op: { op: "delete", index: 1 } },
      { done: true, ops: 1, skipped: 1 },
    ]);
  });

  it("honours a model that answered a whole document instead of operations", async () => {
    const lines = await linesOf(
      deltas('{"type":"doc",', '"content":[{"type":"paragraph"}]}'),
    );
    expect(lines).toEqual([
      { doc: { type: "doc", content: [{ type: "paragraph" }] } },
      { done: true, ops: 0, skipped: 0 },
    ]);
  });

  it("finds the operations through a markdown fence", async () => {
    const lines = await linesOf(deltas('```json\n[{"op":"delete","index":0}]\n```'));
    expect(lines[0]).toEqual({ op: { op: "delete", index: 0 } });
  });

  it("reports a provider error inside the stream, keeping what already arrived", async () => {
    const lines = await linesOf(
      deltas('[{"op":"delete","index":0},', {
        kind: "part",
        part: { type: "error", error: new Error("rate limited") },
      }),
    );
    expect(lines).toEqual([
      { op: { op: "delete", index: 0 } },
      { error: "rate limited", ops: 1 },
    ]);
  });

  it("says so when the model goes quiet for too long", async () => {
    const lines = await linesOf(deltas("[", { kind: "stalled" }));
    expect(lines).toHaveLength(1);
    expect(String(lines[0].error)).toMatch(/quiet/i);
    expect(lines[0].ops).toBe(0);
  });

  it("says so when the answer was cut short by the output ceiling", async () => {
    const lines = await linesOf(
      deltas('[{"op":"delete","index":0},', {
        kind: "part",
        part: { type: "finish", finishReason: "length" },
      }),
    );
    expect(String(lines.at(-1)?.error)).toMatch(/cut short/i);
  });

  it("reports an unreadable document answer rather than a silent success", async () => {
    const lines = await linesOf(deltas("{not json at all"));
    expect(String(lines.at(-1)?.error)).toBeTruthy();
    expect(lines.some((line) => "done" in line)).toBe(false);
  });
});
