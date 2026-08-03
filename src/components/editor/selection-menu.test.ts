import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { editorSchema } from "@/infrastructure/editor/schema";
import { shouldShowSelectionMenu } from "./selection-menu";

const paragraph = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

/**
 * Whether the selection-scoped AI bubble belongs over the current selection.
 *
 * A `NodeSelection` is a whole block picked as one thing — a diagram, a
 * chart, an image — never text, and `selectionRequest` has no textblock to
 * read from it: sending its JSON to a rewrite endpoint answers nothing a
 * document can use. So the bubble stays for text, and hands a selected block
 * to whatever surface already owns it (the drag handle, the canvas).
 */
describe("whether the selection bubble belongs over this selection", () => {
  it("shows over a text selection", () => {
    const doc = editorSchema.nodeFromJSON({ type: "doc", content: [paragraph("hello")] });
    const state = EditorState.create({ doc }).apply(
      EditorState.create({ doc }).tr.setSelection(TextSelection.create(doc, 1, 4)),
    );
    expect(shouldShowSelectionMenu(state)).toBe(true);
  });

  it("stays off an empty selection", () => {
    const doc = editorSchema.nodeFromJSON({ type: "doc", content: [paragraph("hello")] });
    const state = EditorState.create({ doc });
    expect(shouldShowSelectionMenu(state)).toBe(false);
  });

  it("stays off a whole node picked as one thing", () => {
    const doc = editorSchema.nodeFromJSON({
      type: "doc",
      content: [{ type: "pageBreak" }],
    });
    const state = EditorState.create({ doc }).apply(
      EditorState.create({ doc }).tr.setSelection(NodeSelection.create(doc, 0)),
    );
    expect(shouldShowSelectionMenu(state)).toBe(false);
  });
});
