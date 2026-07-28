"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { FormattingRow } from "./editor/FormattingRow";
import { useSelectionRewrite } from "./editor/useSelectionRewrite";

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
export function SelectionAiMenu({
  editor,
  onAiEdit,
}: {
  editor: Editor;
  /** Runs a whole-block replacement under the document's AI review bar. */
  onAiEdit: (apply: () => void) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const { busy, error, rewrite } = useSelectionRewrite(editor, onAiEdit);

  const submitPrompt = () => {
    const instruction = prompt.trim();
    if (!instruction) return;
    setPrompt("");
    void rewrite(instruction);
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
          <FormattingRow editor={editor} />
          <div className="ai-bubble-row">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                className="ai-bubble-btn"
                onClick={() => void rewrite(qa.instruction)}
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
