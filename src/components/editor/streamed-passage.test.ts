import { describe, expect, it } from "vitest";
import { StreamedPassage } from "./streamed-passage";

describe("where a streamed answer lands", () => {
  it("puts the first block over the passage it replaces", () => {
    const passage = new StreamedPassage({ from: 10, to: 40 });

    expect(passage.target).toEqual({ from: 10, to: 40 });
  });

  it("puts every later block after what has already landed", () => {
    const passage = new StreamedPassage({ from: 10, to: 40 });

    passage.grewBy(-8);

    expect(passage.target).toEqual({ from: 32, to: 32 });
  });

  /** The passage is gone after the first block; the rest only appends. */
  it("keeps appending as more blocks arrive", () => {
    const passage = new StreamedPassage({ from: 10, to: 40 });

    passage.grewBy(-8);
    passage.grewBy(12);

    expect(passage.target).toEqual({ from: 44, to: 44 });
  });

  /**
   * What Reject, or a stream that ended badly, has to take back: the whole
   * answer as one range, never the instalment that happened to arrive last.
   */
  it("reports everything the answer occupies", () => {
    const passage = new StreamedPassage({ from: 10, to: 40 });

    passage.grewBy(-8);
    passage.grewBy(12);

    expect(passage.written).toEqual({ from: 10, to: 44 });
  });

  it("occupies the passage itself before anything has landed", () => {
    expect(new StreamedPassage({ from: 10, to: 40 }).written).toEqual({ from: 10, to: 40 });
  });

  it("says whether anything of the answer is in the document yet", () => {
    const passage = new StreamedPassage({ from: 10, to: 40 });

    expect(passage.started).toBe(false);
    passage.grewBy(5);
    expect(passage.started).toBe(true);
  });

  it("survives an answer that landed exactly as long as the passage", () => {
    const passage = new StreamedPassage({ from: 3, to: 9 });

    passage.grewBy(0);

    expect(passage.written).toEqual({ from: 3, to: 9 });
    expect(passage.target).toEqual({ from: 9, to: 9 });
  });
});
