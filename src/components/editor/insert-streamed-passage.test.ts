import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { insertStreamedPassage } from "./insert-streamed-passage";
import type { PassageAnswer, PassageRequest } from "./passage-request";

/**
 * What is left of the document when a streamed passage edit ends badly.
 *
 * The rule has one job: whatever happens, the passage the user had is still
 * there. A stream can end badly in two ways — the answer says so, or the stream
 * dies and the call throws — and only the first was ever handled. On a call that
 * takes minutes the second is the likely one, and it costs the writer the block
 * they asked about, with the answer's leftovers in its place.
 */

/** Just enough editor: a size that moves, and the edits recorded in order. */
function fakeEditor(): { editor: Editor; edits: { at: unknown; content: unknown }[] } {
  const edits: { at: unknown; content: unknown }[] = [];
  let size = 100;
  const editor = {
    get state() {
      return { doc: { content: { size } } };
    },
    chain: () => ({
      insertContentAt(at: unknown, content: unknown) {
        edits.push({ at, content });
        // Whatever lands is worth ten: the arithmetic is not what is under test.
        size += 10;
        return { run: () => true };
      },
    }),
  } as unknown as Editor;
  return { editor, edits };
}

const PASSAGE: JSONContent = { type: "codeBlock", content: [{ type: "text", text: "+--+" }] };

const request: PassageRequest = {
  blocks: [PASSAGE],
  instruction: "Turn this block into a diagram",
  surface: { kind: "block-action", family: "turn-into" },
};

/** An answer that lands `blocks` and then ends the way `ending` says. */
function answering(blocks: JSONContent[], ending: PassageAnswer | Error) {
  return async (_request: PassageRequest, onBlock: (block: JSONContent) => void) => {
    blocks.forEach(onBlock);
    if (ending instanceof Error) throw ending;
    return ending;
  };
}

describe("a streamed passage that ended badly", () => {
  it("puts the passage back when the answer reports a breach", async () => {
    const { editor, edits } = fakeEditor();

    const answer = await insertStreamedPassage(
      editor,
      request,
      { from: 4, to: 20 },
      answering([{ type: "diagram" }], { error: "you changed the text", reason: null }),
    );

    expect(answer.error).toBe("you changed the text");
    expect(edits.at(-1)?.content).toEqual([PASSAGE]);
  });

  it("puts the passage back when the stream dies mid-answer", async () => {
    const { editor, edits } = fakeEditor();

    const answer = await insertStreamedPassage(
      editor,
      request,
      { from: 4, to: 20 },
      answering([{ type: "diagram" }], new Error("terminated")),
    );

    expect(answer.error).toBe("terminated");
    expect(edits.at(-1)?.content, "the block the user asked about is gone").toEqual([PASSAGE]);
  });

  it("leaves the document alone when the stream died before writing anything", async () => {
    const { editor, edits } = fakeEditor();

    await insertStreamedPassage(
      editor,
      request,
      { from: 4, to: 20 },
      answering([], new Error("terminated")),
    );

    expect(edits).toEqual([]);
  });

  it("keeps an answer that landed whole", async () => {
    const { editor, edits } = fakeEditor();

    const answer = await insertStreamedPassage(
      editor,
      request,
      { from: 4, to: 20 },
      answering([{ type: "diagram" }], { error: null, reason: "the designer" }),
    );

    expect(answer.reason).toBe("the designer");
    expect(edits).toHaveLength(1);
  });
});
