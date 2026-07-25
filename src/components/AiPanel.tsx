"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { transformDocumentAction } from "@/app/ai-actions";
import { toPlainJSON } from "@/lib/doc/plain";
import { applyOps } from "@/lib/doc/ops";

interface PanelItem {
  role: "user" | "ai";
  text: string;
  error?: boolean;
}

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
  const [items, setItems] = useState<PanelItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const push = (item: PanelItem) => {
    setItems((prev) => [...prev, item]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  };

  const run = async (instruction: string, label?: string) => {
    if (busy) return;
    setBusy(true);
    push({ role: "user", text: label ?? instruction });
    const before = toPlainJSON(editor.getJSON());
    const res = await transformDocumentAction(before, instruction);
    if (!res.ok) {
      push({ role: "ai", text: res.error, error: true });
      setBusy(false);
      return;
    }

    // The AI edits blocks by index; applying the ops here keeps everything it
    // did not name byte-identical instead of trusting a rewritten document.
    const next =
      res.outcome.kind === "ops"
        ? applyOps(before, res.outcome.ops)
        : res.outcome.content;

    if (JSON.stringify(next) === JSON.stringify(before)) {
      push({
        role: "ai",
        text: "The AI returned the document unchanged — try a more specific instruction.",
        error: true,
      });
    } else {
      onApply(next);
      const count = res.outcome.kind === "ops" ? res.outcome.ops.length : 0;
      push({
        role: "ai",
        text: count
          ? `Done — ${count} block${count > 1 ? "s" : ""} edited.`
          : "Done — applied to the document.",
      });
    }
    setBusy(false);
  };

  const submit = () => {
    const instruction = input.trim();
    if (!instruction) return;
    setInput("");
    void run(instruction);
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
            onClick={() => void run(qa.instruction, qa.label)}
          >
            {qa.label}
          </button>
        ))}
      </div>

      <div className="ai-thread" ref={listRef}>
        {items.length === 0 && (
          <p className="ai-empty">
            Ask for changes to the whole document — restructure, shorten,
            change tone, add sections…
          </p>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            className={`ai-msg ai-msg-${item.role}${item.error ? " ai-msg-error" : ""}`}
          >
            {item.text}
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
