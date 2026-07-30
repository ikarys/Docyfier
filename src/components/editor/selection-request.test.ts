import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { editorSchema } from "@/infrastructure/editor/schema";
import { selectionRequest } from "./selection-request";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

/** A document, with the selection running from `from` to `to`. */
function selecting(content: unknown[], from: number, to: number): EditorState {
  const doc = editorSchema.nodeFromJSON({ type: "doc", content });
  const state = EditorState.create({ doc });
  return state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, from, to)),
  );
}

/** Which assistant runs is another module's decision; what this one owes is
 * carrying it through untouched. */
const QUICK = { kind: "selection-quick" } as const;

describe("a selection inside one text block", () => {
  // "Hello world" starts at 1; "world" is 7..12.
  const state = selecting([paragraph("Hello world")], 7, 12);

  it("goes to the model as plain text", () => {
    expect(selectionRequest(state, "shorten", QUICK).input).toEqual({
      mode: "text",
      text: "world",
      instruction: "shorten",
    });
  });

  it("comes back into exactly what was selected", () => {
    expect(selectionRequest(state, "shorten", QUICK).range).toEqual({ from: 7, to: 12 });
  });
});

describe("a selection crossing blocks", () => {
  // Two paragraphs of 5 characters: "first" is 1..6, "second" is 8..14.
  const state = selecting([paragraph("first"), paragraph("second")], 4, 10);
  const request = selectionRequest(state, "make it pretty", QUICK);

  it("sends whole blocks, not the fragments the user happened to cover", () => {
    expect(request.input).toMatchObject({
      mode: "blocks",
      blocks: [paragraph("first"), paragraph("second")],
      instruction: "make it pretty",
    });
  });

  it("replaces those blocks entirely, so the result stays well-formed", () => {
    expect(request.range).toEqual({ from: 0, to: 15 });
  });

  it("sends plain objects a server function will accept", () => {
    const [first] = (request.input as { blocks: object[] }).blocks;
    expect(Object.getPrototypeOf(first)).toBe(Object.prototype);
  });
});

describe("a selection inside a list", () => {
  const list = {
    type: "bulletList",
    content: [
      { type: "listItem", content: [paragraph("one")] },
      { type: "listItem", content: [paragraph("two")] },
    ],
  };

  it("grows to the list itself rather than sending an orphan item", () => {
    const request = selectionRequest(selecting([list], 3, 10), "tighten", QUICK);
    expect(request.input).toMatchObject({ mode: "blocks", blocks: [list] });
    expect(request.range).toEqual({ from: 0, to: 16 });
  });
});
