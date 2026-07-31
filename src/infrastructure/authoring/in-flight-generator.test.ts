import { describe, expect, it, vi } from "vitest";
import type {
  GeneratedText,
  GenerationRequest,
  TextGenerator,
} from "@/domain/authoring/text-generator";
import { sharingInFlightCalls } from "./in-flight-generator";

const ASK: GenerationRequest = {
  system: "be brief",
  prompt: "shorten this",
  temperature: 0.3,
};

/** A generator whose answer is held open until the test lets it finish. */
function heldGenerator(): {
  generator: TextGenerator;
  calls: () => number;
  release: () => void;
} {
  let calls = 0;
  const open: (() => void)[] = [];
  const answer = async (): Promise<GeneratedText> => {
    calls++;
    const mine = calls;
    await new Promise<void>((resolve) => open.push(resolve));
    return { text: `answer ${mine}`, truncated: false };
  };
  return {
    generator: { generate: answer },
    calls: () => calls,
    release: () => open.splice(0).forEach((resolve) => resolve()),
  };
}

describe("sharing a call that is already in flight", () => {
  it("asks the model once when the same request arrives twice", async () => {
    const { generator, calls, release } = heldGenerator();
    const shared = sharingInFlightCalls(generator);

    const first = shared.generate(ASK);
    const second = shared.generate(ASK);
    release();

    expect(await first).toEqual(await second);
    expect(calls()).toBe(1);
  });

  it("keeps two different requests apart", async () => {
    const { generator, calls, release } = heldGenerator();
    const shared = sharingInFlightCalls(generator);

    const first = shared.generate(ASK);
    const second = shared.generate({ ...ASK, prompt: "expand this" });
    release();
    await Promise.all([first, second]);

    expect(calls()).toBe(2);
  });

  /** Nothing is remembered: the same question asked a minute later is a new
   * question, because the document it was asked about has moved on. */
  it("asks again once the first answer has landed", async () => {
    const generate = vi.fn(async () => ({ text: "done", truncated: false }));
    const shared = sharingInFlightCalls({ generate });

    await shared.generate(ASK);
    await shared.generate(ASK);

    expect(generate).toHaveBeenCalledTimes(2);
  });

  it("lets a failure reach every caller, and forgets it", async () => {
    const generate = vi.fn(async () => {
      throw new Error("nope");
    });
    const shared = sharingInFlightCalls({ generate });

    await expect(Promise.all([shared.generate(ASK), shared.generate(ASK)])).rejects.toThrow(
      "nope",
    );
    await expect(shared.generate(ASK)).rejects.toThrow("nope");
    expect(generate).toHaveBeenCalledTimes(2);
  });

});
