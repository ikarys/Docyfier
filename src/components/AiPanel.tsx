"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useDocumentAssistant } from "./editor/useDocumentAssistant";

const QUICK_ACTIONS: { label: string; instruction: string }[] = [
  {
    label: "✦ Make it pretty",
    instruction:
      "Restructure and reformat this document so it looks professional and modern: clear heading hierarchy, tables where data is tabular, callouts for key points and risks, lists where appropriate. Preserve the meaning and all information.",
  },
  { label: "Shorten", instruction: "Shorten the document while keeping all key information." },
  { label: "More formal", instruction: "Rewrite the document in a more formal, professional tone." },
  { label: "Add conclusion", instruction: "Add a concise conclusion section at the end of the document." },
];

/**
 * Surface 2 — side panel for whole-document AI operations. Sends the current
 * document plus an instruction, applies the returned document to the editor.
 */
export function AiPanel({
  editor,
  onApply,
  onClose,
}: {
  editor: Editor;
  onApply: (content: JSONContent) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const { messages, busy, ask, thread } = useDocumentAssistant(editor, onApply);

  const submit = () => {
    const instruction = input.trim();
    if (!instruction) return;
    setInput("");
    void ask(instruction);
  };

  return (
    <aside className="ai-panel no-print">
      <div className="ai-panel-head">
        <span className="ai-panel-title">✦ Assistant</span>
        <button className="ai-panel-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="ai-quick">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa.label}
            className="chip"
            disabled={busy}
            onClick={() => void ask(qa.instruction, qa.label)}
          >
            {qa.label}
          </button>
        ))}
      </div>

      <div className="ai-thread" ref={thread}>
        {messages.length === 0 && (
          <p className="ai-empty">
            Ask for changes to the whole document — restructure, shorten, change
            tone, add sections…
          </p>
        )}
        {messages.map((message, i) => (
          <div
            key={i}
            className={`ai-msg ai-msg-${message.role}${message.error ? " ai-msg-error" : ""}`}
          >
            {message.text}
          </div>
        ))}
        {busy && (
          <div className="ai-msg ai-msg-ai ai-msg-busy">
            <span className="spinner" aria-hidden /> Working…
          </div>
        )}
      </div>

      <div className="ai-input-row">
        <textarea
          className="ai-input"
          rows={2}
          placeholder="Ask for a change to the document…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          className="btn btn-primary ai-send"
          disabled={busy || !input.trim()}
          onClick={submit}
          title="Send"
        >
          ↑
        </button>
      </div>
    </aside>
  );
}
