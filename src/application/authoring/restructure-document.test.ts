import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import type { DocOp } from "@/domain/authoring/ops";
import { restructureDocument } from "./restructure-document";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const answer = (value: unknown) => JSON.stringify(value);

const BLOCKS = [
  { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Vendors" }] },
  paragraph("Vendor A costs 120k a year."),
  paragraph("Vendor B costs 90k a year."),
];

const GRID = {
  type: "cardGrid",
  content: [
    { type: "card", content: [paragraph("Vendor A costs 120k a year.")] },
    { type: "card", content: [paragraph("Vendor B costs 90k a year.")] },
  ],
};

async function opsOf(generator: ScriptedGenerator, blocks = BLOCKS): Promise<DocOp[]> {
  const collected: DocOp[] = [];
  for await (const op of restructureDocument(authoringDeps(generator), blocks, "make it pretty")) {
    collected.push(op);
  }
  return collected;
}

describe("restructureDocument", () => {
  it("turns each planned span into one operation covering it", async () => {
    const generator = new ScriptedGenerator([
      answer([{ from: 1, through: 2, as: "cardGrid" }]),
      answer({ type: "doc", content: [GRID] }),
    ]);

    expect(await opsOf(generator)).toEqual([
      { op: "replace", index: 1, through: 2, blocks: [GRID] },
    ]);
  });

  /** The whole point of the split: the call that decides never sees the
   * document's JSON, only a line per block, and never the block syntax it is
   * not going to write. */
  it("decides from an outline, not from the document", async () => {
    const generator = new ScriptedGenerator([answer([])]);
    await opsOf(generator);

    const { system, prompt } = generator.requests[0];
    expect(prompt).toContain("1: Vendor A costs 120k a year.");
    expect(prompt).not.toContain('"type"');
    expect(system).not.toContain('{"type":"cardGrid"');
  });

  it("asks for nothing when the plan found nothing worth changing", async () => {
    const generator = new ScriptedGenerator([answer([])]);

    expect(await opsOf(generator)).toEqual([]);
    expect(generator.requests).toHaveLength(1);
  });

  it("shows a span only the blocks it covers", async () => {
    const generator = new ScriptedGenerator([
      answer([{ from: 1, through: 2, as: "cardGrid" }]),
      answer({ type: "doc", content: [GRID] }),
    ]);
    await opsOf(generator);

    expect(generator.requests[1].prompt).toContain("Vendor A costs 120k");
    expect(generator.requests[1].prompt).not.toContain("Vendors");
    expect(generator.requests[1].prompt).toContain("one cardGrid");
  });

  /**
   * Spans are decided independently, so they fail independently. One the
   * assistant rewrote instead of arranging costs its own span and nothing else,
   * which is what planning first buys over one answer that stands or falls
   * whole.
   */
  it("drops the span that broke the charter and keeps the rest", async () => {
    const rewritten = { type: "doc", content: [paragraph("Vendor A is the safer choice overall.")] };
    const generator = new ScriptedGenerator([
      answer([
        { from: 1, as: "callout" },
        { from: 2, as: "callout" },
      ]),
      answer(rewritten),
      answer({ type: "doc", content: [paragraph("Vendor B costs 90k a year.")] }),
    ]);

    const ops = await opsOf(generator);
    expect(ops).toHaveLength(1);
    expect(ops[0].index).toBe(2);
  });

  it("spends the thinking on the plan and not on the spans", async () => {
    const generator = new ScriptedGenerator([
      answer([{ from: 1, as: "callout" }]),
      answer({ type: "doc", content: [paragraph("Vendor A costs 120k a year.")] }),
    ]);
    await opsOf(generator);

    expect(generator.requests[0].effort).toBe("medium");
    expect(generator.requests[1].effort).toBe("low");
  });
});
