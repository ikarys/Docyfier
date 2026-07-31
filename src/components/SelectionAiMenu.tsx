"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { FormattingRow } from "./editor/FormattingRow";
import type { AiReview } from "./editor/useAiReview";
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
  review,
}: {
  editor: Editor;
  /** Runs a whole-block replacement under the document's AI review bar. */
  review: AiReview;
}) {
  const [prompt, setPrompt] = useState("");
  const { busy, error, reason, rewrite } = useSelectionRewrite(editor, review);

  const submitPrompt = () => {
    const instruction = prompt.trim();
    if (!instruction) return;
    setPrompt("");
    // Only a request in the user's own words needs reading before it is routed.
    void rewrite(instruction, { kind: "free-prompt" });
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
          {/* Which assistant is working is the whole point of running two:
              a black box nobody can name is a black box nobody can report. */}
          <span className="spinner" aria-hidden /> {reason ?? "Reading your request"}…
        </div>
      ) : (
        <>
          <FormattingRow editor={editor} />
          <div className="ai-bubble-row">
            {QUICK_ACTIONS.map((qa) => (
              <button
                key={qa.label}
                className="ai-bubble-btn"
                onClick={() => void rewrite(qa.instruction, { kind: "rewording" })}
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
          {/* A dropped step is not a failure: the other assistant's work is in
              the document and under review. Said plainly, once. */}
        </>
      )}
    </BubbleMenu>
  );
}
