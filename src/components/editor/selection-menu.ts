import { NodeSelection, type EditorState } from "@tiptap/pm/state";

/**
 * Whether the selection-scoped AI bubble belongs over the current selection.
 *
 * A `NodeSelection` is a whole block picked as one thing — a diagram, a
 * chart, an image — never text. `selectionRequest` has no textblock to read
 * from it and no boundary that stops at "the node", so the bubble would ship
 * that block's JSON to a rewrite endpoint built for prose. Text only.
 */
export function shouldShowSelectionMenu(state: EditorState): boolean {
  return !state.selection.empty && !(state.selection instanceof NodeSelection);
}
