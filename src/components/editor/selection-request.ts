import type { EditorState } from "@tiptap/pm/state";
import type { JSONContent } from "@tiptap/core";
import type { SelectionInput } from "@/app/ai-actions";
import type { Surface } from "@/domain/authoring/agents/routing";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";

/**
 * What to send the model for the current selection, and what the answer will
 * replace.
 *
 * A selection inside one text block round-trips as plain text — the smallest
 * thing that can come back, and the one the editor can drop in place. Anything
 * wider is grown to whole top-level blocks first: a model handed half a table
 * row answers with something the schema cannot accept, and a replacement that
 * starts mid-node cannot be well-formed either.
 */
export interface SelectionRequest {
  input: SelectionInput;
  range: { from: number; to: number };
}

export function selectionRequest(
  state: EditorState,
  instruction: string,
  surface: Surface,
): SelectionRequest {
  const { from, to, $from, $to } = state.selection;

  if ($from.sameParent($to) && $from.parent.isTextblock) {
    return {
      range: { from, to },
      input: { mode: "text", text: state.doc.textBetween(from, to, "\n"), instruction },
    };
  }

  const start = $from.depth ? $from.before(1) : from;
  const end = $to.depth ? $to.after(1) : to;
  const blocks: JSONContent[] = [];
  state.doc.nodesBetween(start, end, (node, _pos, parent) => {
    if (parent !== state.doc) return true;
    blocks.push(node.toJSON() as JSONContent);
    return false;
  });

  return {
    range: { from: start, to: end },
    input: { mode: "blocks", blocks: toPlainJSON(blocks), instruction, surface },
  };
}
