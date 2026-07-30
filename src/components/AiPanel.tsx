"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Surface } from "@/domain/authoring/agents/routing";
import type { JSONContent } from "@tiptap/core";
import type { DocumentTheme } from "@/lib/themes";
import { AiThread } from "./editor/AiThread";
import { useDocumentAssistant } from "./editor/useDocumentAssistant";
import { useRestyle } from "./editor/useRestyle";

const QUICK_ACTIONS: {
  label: string;
  instruction: string;
  /** Which assistant this button asks for — no model reads a button. */
  surface: Surface;
  /** Also ask the model to dress the document — restructuring it without ever
   * revisiting its accent or its typeface is half the job. */
  restyles?: true;
}[] = [
  {
    label: "✦ Make it pretty",
    instruction:
      "Restructure and reformat this document so it looks professional and modern: clear heading hierarchy, tables where data is tabular, callouts for key points and risks, lists where appropriate. Preserve the meaning and all information.",
    surface: { kind: "styling" },
    restyles: true,
  },
  {
    label: "Shorten",
    instruction: "Shorten the document while keeping all key information.",
    surface: { kind: "rewording" },
  },
  {
    label: "More formal",
    instruction: "Rewrite the document in a more formal, professional tone.",
    surface: { kind: "rewording" },
  },
  {
    label: "Add conclusion",
    instruction: "Add a concise conclusion section at the end of the document.",
    surface: { kind: "rewording" },
  },
];

/**
 * Surface 2 — side panel for whole-document AI operations. Sends the current
 * document plus an instruction, applies the returned document to the editor.
 */
export function AiPanel({
  editor,
  onApply,
  onChangeTheme,
  onInsert,
  onClose,
}: {
  editor: Editor;
  onApply: (content: JSONContent) => void;
  onChangeTheme: (theme: DocumentTheme) => void;
  /** Put an answer into the document — the only way a question ever writes. */
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  /** Editing the document, or asking it something. */
  const [mode, setMode] = useState<"edit" | "ask">("edit");
  const { messages, busy, edits, ask, question, thread } = useDocumentAssistant(
    editor,
    onApply,
  );
  const restyle = useRestyle(editor, onChangeTheme);

  const submit = () => {
    const said = input.trim();
    if (!said) return;
    setInput("");
    void (mode === "ask" ? question(said) : ask(said, { kind: "free-prompt" }));
  };

  const runQuickAction = async (action: (typeof QUICK_ACTIONS)[number]) => {
    await ask(action.instruction, action.surface, action.label);
    if (action.restyles) await restyle.run();
  };

  return (
    <aside className="ai-panel no-print">
      <div className="ai-panel-head">
        <span className="ai-panel-title">✦ Assistant</span>
        <button className="ai-panel-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="ai-modes" role="tablist" aria-label="What to do with the document">
        {(["edit", "ask"] as const).map((which) => (
          <button
            key={which}
            role="tab"
            aria-selected={mode === which}
            className="ai-mode"
            onClick={() => setMode(which)}
          >
            {which === "edit" ? "Edit" : "Ask"}
          </button>
        ))}
      </div>

      {/* The quick actions all rewrite the document: in Ask mode there is
          nothing for them to do. */}
      {mode === "edit" && (
        <div className="ai-quick">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa.label}
              className="chip"
              disabled={busy || restyle.busy}
              onClick={() => void runQuickAction(qa)}
            >
              {qa.label}
            </button>
          ))}
        </div>
      )}

      <AiThread
        messages={messages}
        busy={busy}
        edits={edits}
        empty={
          mode === "ask"
            ? "Ask the document a question — what it says, what it leaves out. Nothing is written until you insert an answer."
            : "Ask for changes to the whole document — restructure, shorten, change tone, add sections…"
        }
        thread={thread}
        onInsert={onInsert}
      />

      <div className="ai-input-row">
        <textarea
          className="ai-input"
          rows={2}
          placeholder={
            mode === "ask"
              ? "Ask a question about this document…"
              : "Ask for a change to the document…"
          }
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
