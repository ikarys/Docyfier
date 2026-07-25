"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { JSONContent } from "@tiptap/core";
import { rewriteSelectionAction, type SelectionInput } from "@/app/ai-actions";
import { toPlainJSON } from "@/lib/doc/plain";

const QUICK_ACTIONS: { label: string; instruction: string }[] = [
  { label: "Rephrase", instruction: "Rephrase this to read better." },
  { label: "Shorten", instruction: "Make this more concise." },
  { label: "Expand", instruction: "Expand this with more detail." },
  { label: "Formal", instruction: "Rewrite this in a more formal, professional tone." },
];

const TEXT_COLORS = ["#3b5bdb", "#1f9d6b", "#c23b3b", "#b4690e", "#7048e8"];
const HIGHLIGHT_COLORS = ["#fff3bf", "#e9f7f0", "#fbecec", "#eef2fe", "#f3f0ff"];

/** Bold/italic/strike/code/badge + color swatches — the old toolbar's inline
 * formatting group, moved onto the selection so it's reachable without the
 * toolbar (PLAN.md STEP U1). */
function FormattingRow({ editor }: { editor: Editor }) {
  const active = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? "ai-bubble-btn is-active" : "ai-bubble-btn";

  return (
    <div className="ai-bubble-row ai-bubble-format">
      <button
        className={active("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        className={active("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        className={active("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <button
        className={active("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        {"</>"}
      </button>
      <button
        className={active("badge")}
        onClick={() => editor.chain().focus().toggleBadge("blue").run()}
        title="Badge / pill"
      >
        ◆
      </button>
      <span className="ai-bubble-divider" aria-hidden />
      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          className="ai-bubble-swatch"
          style={{ background: color }}
          onClick={() => editor.chain().focus().setColor(color).run()}
          title={`Text color ${color}`}
        />
      ))}
      <button
        className="ai-bubble-swatch ai-bubble-swatch-clear"
        onClick={() => editor.chain().focus().unsetColor().run()}
        title="Clear text color"
      >
        ✕
      </button>
      <span className="ai-bubble-divider" aria-hidden />
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          className="ai-bubble-swatch"
          style={{ background: color }}
          onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
          title={`Highlight ${color}`}
        />
      ))}
      <button
        className="ai-bubble-swatch ai-bubble-swatch-clear"
        onClick={() => editor.chain().focus().unsetHighlight().run()}
        title="Clear highlight"
      >
        ✕
      </button>
    </div>
  );
}

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
      input = { mode: "blocks", blocks: toPlainJSON(blocks), instruction };
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
          <FormattingRow editor={editor} />
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
