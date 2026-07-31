import { describe, expect, it } from "vitest";
import { plainPassage } from "./passage-request";

/**
 * What a passage may look like by the time it crosses a server boundary.
 *
 * ProseMirror computes every `attrs` with `Object.create(null)` and `toJSON()`
 * hands those very objects back. React Server Functions refuse them: the object
 * arrives as a temporary client reference, and the first server-side read of
 * `attrs.language` — which is the first thing a code block is asked for — fails
 * with "Cannot access language on the server". A drawing pasted as a code block
 * is exactly that node, so the surface this rule protects is the one that broke.
 *
 * `selection-request.ts` already knew; the block action did not. Stating it here
 * means no caller has to remember.
 */

/** A block shaped the way ProseMirror hands one over. */
function asProseMirrorWould(): Record<string, unknown> {
  const attrs = Object.create(null) as Record<string, unknown>;
  attrs.language = null;
  return { type: "codeBlock", attrs, content: [{ type: "text", text: "+--+" }] };
}

describe("a passage on its way to the server", () => {
  it("carries no attrs a server function would refuse", () => {
    const request = plainPassage({
      blocks: [asProseMirrorWould()],
      instruction: "Turn this block into a diagram",
      surface: { kind: "block-action", family: "turn-into" },
    });

    const attrs = (request.blocks[0] as { attrs: object }).attrs;
    expect(Object.getPrototypeOf(attrs)).toBe(Object.prototype);
  });

  it("changes nothing about what the passage says", () => {
    const request = plainPassage({
      blocks: [asProseMirrorWould()],
      instruction: "Turn this block into a diagram",
      surface: { kind: "block-action", family: "turn-into" },
    });

    expect(request.blocks[0]).toEqual({
      type: "codeBlock",
      attrs: { language: null },
      content: [{ type: "text", text: "+--+" }],
    });
    expect(request.instruction).toBe("Turn this block into a diagram");
    expect(request.surface).toEqual({ kind: "block-action", family: "turn-into" });
  });
});
