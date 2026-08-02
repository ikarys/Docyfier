import { describe, expect, it } from "vitest";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import type { GeneratedText, GenerationRequest, TextGenerator } from "@/domain/authoring/text-generator";
import { emptyRead, readAnswer, repairFailedBlocks, type Part } from "./read-block-stream";

const style = StyleParameters.defaults();

function partsOf(...parts: Part[]): { parts: AsyncIterator<Part>; firstText: string } {
  const [first, ...rest] = parts;
  let i = 0;
  return {
    firstText: (first as { text: string }).text,
    parts: {
      next: async () => {
        if (i >= rest.length) return { done: true, value: undefined as never };
        return { done: false, value: rest[i++] };
      },
    },
  };
}

function textDelta(text: string): Part {
  return { type: "text-delta", text } as unknown as Part;
}

describe("readAnswer", () => {
  it("keeps a block the schema rejects for repair, rather than only counting it", async () => {
    const read = emptyRead();
    const blocks: unknown[] = [];
    const source = partsOf(textDelta('::: diagram {"kind":"nonsense"}\n:::\n'));
    await readAnswer(source, style, (block) => blocks.push(block), read);
    expect(read.blocks).toBe(0);
    expect(read.retriable).toHaveLength(1);
    expect(read.retriable[0].raw).toBe('::: diagram {"kind":"nonsense"}\n:::');
  });
});

describe("repairFailedBlocks", () => {
  const request = { system: "You draw diagrams.", prompt: "Draw one.", temperature: 0.2 };

  it("sends what failed and the exact error, and accepts a corrected block", async () => {
    const read = emptyRead();
    read.retriable = [
      {
        raw: '::: diagram {"kind":"nonsense"}\n:::',
        error: 'diagram "kind" must be one of flow, architecture, sequence, hierarchy, timeline',
      },
    ];
    const sent: unknown[] = [];
    const seenPrompts: string[] = [];
    const generator: TextGenerator = {
      async generate(req: GenerationRequest): Promise<GeneratedText> {
        seenPrompts.push(req.prompt);
        return {
          text: '::: diagram {"kind":"flow","direction":"down","nodes":[{"id":"a","label":"A"}],"edges":[],"groups":[],"title":null,"caption":null}\n:::',
          truncated: false,
        };
      },
    };

    await repairFailedBlocks(generator, request, read, style, (block) => sent.push(block));

    expect(read.retriable).toHaveLength(0);
    expect(read.skipped).toBe(0);
    expect(read.blocks).toBe(1);
    expect(sent).toHaveLength(1);
    expect(seenPrompts[0]).toContain("nonsense");
    expect(seenPrompts[0]).toContain('diagram "kind" must be one of');
  });

  it("drops a block that fails again after one repair attempt, with no further retry", async () => {
    const read = emptyRead();
    read.retriable = [{ raw: '::: diagram {"kind":"nonsense"}\n:::', error: "still wrong" }];
    let calls = 0;
    const generator: TextGenerator = {
      async generate(): Promise<GeneratedText> {
        calls++;
        return { text: '::: diagram {"kind":"still-nonsense"}\n:::', truncated: false };
      },
    };

    await repairFailedBlocks(generator, request, read, style, () => {});

    expect(calls).toBe(1);
    expect(read.skipped).toBe(1);
    expect(read.blocks).toBe(0);
  });

  it("drops a block when the repair call itself fails", async () => {
    const read = emptyRead();
    read.retriable = [{ raw: "bad", error: "bad" }];
    const generator: TextGenerator = {
      async generate(): Promise<GeneratedText> {
        throw new Error("provider unreachable");
      },
    };

    await repairFailedBlocks(generator, request, read, style, () => {});

    expect(read.skipped).toBe(1);
  });
});
