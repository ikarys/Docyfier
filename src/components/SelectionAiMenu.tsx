"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { JSONContent } from "@tiptap/core";
import { rewriteSelectionAction, type SelectionInput } from "@/app/ai-actions";

const QUICK_ACTIONS: { label: string; instruction: string }[] = [
  { label: "Rephrase", instruction: "Rephrase this to read better." },
  { label: "Shorten", instruction: "Make this more concise." },
  { label: "Expand", instruction: "Expand this with more detail." },
  { label: "Formal", instruction: "Rewrite this in a more formal, professional tone." },
];

/**
 * Surface 3 — floating menu over the current selection. Quick rewrite actions
 * plus a free prompt applied only to the selected range. Single-block
 * selections round-trip as plain text; multi-block selections are replaced
 * as whole blocks (schema-validated server-side).
 */
export function SelectionAiMenu({ editor }: { editor: Editor }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");

  const run = async (instruction: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);

    const { state } = editor;
    const { from, to, $from, $to } = state.selection;
    const inline = $from.sameParent($to) && $from.parent.isTextblock;

    let input: SelectionInput;
    let range = { from, to };
    if (inline) {
      input = {
        mode: "text",
        text: state.doc.textBetween(from, to, "\n"),
        instruction,
      };
    } else {
      // Expand to whole top-level blocks so the replacement stays well-formed.
      const start = $from.depth ? $from.before(1) : from;
      const end = $to.depth ? $to.after(1) : to;
      range = { from: start, to: end };
      const blocks: JSONContent[] = [];
      state.doc.nodesBetween(start, end, (node, _pos, parent) => {
        if (parent === state.doc) {
          blocks.push(node.toJSON() as JSONContent);
          return false;
        }
        return true;
      });
      input = { mode: "blocks", blocks, instruction };
    }

    const res = await rewriteSelectionAction(input);
    if (!res.ok) {
      setError(res.error);
    } else if (res.mode === "text") {
      editor.chain().focus().insertContentAt(range, res.text).run();
    } else {
      editor.chain().focus().insertContentAt(range, res.blocks).run();
    }
    setBusy(false);
  };

  const submitPrompt = () => {
    const instruction = prompt.trim();
    if (!instruction) return;
    setPrompt("");
    void run(instruction);
  };

  return (
    <BubbleMenu
      editor={editor}
      className="ai-bubble no-print"
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: e, state }) =>
        e.isEditable && !state.selection.empty
      }
    >
      {busy ? (
        <div className="ai-bubble-busy">
          <span className="spinner" aria-hidden /> Rewriting…
        </div>
      ) : (
        <>
          <div className="ai-bubble-row">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                className="ai-bubble-btn"
                onClick={() => void run(qa.instruction)}
              >
                {qa.label}
              </button>
            ))}
          </div>
          <div className="ai-bubble-row">
            <input
              className="ai-bubble-input"
              placeholder="✦ Ask AI about this selection…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitPrompt();
                }
              }}
            />
            <button
              className="ai-bubble-btn ai-bubble-send"
              disabled={!prompt.trim()}
              onClick={submitPrompt}
            >
              ↑
            </button>
          </div>
          {error && <div className="ai-bubble-error">{error}</div>}
        </>
      )}
    </BubbleMenu>
  );
}
