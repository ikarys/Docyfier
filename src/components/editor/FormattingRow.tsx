"use client";

import type { Editor } from "@tiptap/react";
import { promptForLink } from "./link-prompt";

const ALIGNMENTS: { value: string; icon: string; title: string }[] = [
  { value: "left", icon: "⯇", title: "Align left" },
  { value: "center", icon: "⯅", title: "Align center" },
  { value: "right", icon: "⯈", title: "Align right" },
];

const TEXT_COLORS = ["#3b5bdb", "#1f9d6b", "#c23b3b", "#b4690e", "#7048e8"];
const HIGHLIGHT_COLORS = ["#fff3bf", "#e9f7f0", "#fbecec", "#eef2fe", "#f3f0ff"];

/** Bold/italic/strike/code/badge + color swatches — the old toolbar's inline
 * formatting group, moved onto the selection so it's reachable without the
 * toolbar (PLAN.md STEP U1). */
export function FormattingRow({ editor }: { editor: Editor }) {
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
        className={active("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <u>U</u>
      </button>
      <button
        className={active("badge")}
        onClick={() => editor.chain().focus().toggleBadge("blue").run()}
        title="Badge / pill"
      >
        ◆
      </button>
      <button
        className={active("link")}
        onClick={() => promptForLink(editor)}
        title="Link"
      >
        🔗
      </button>
      <span className="ai-bubble-divider" aria-hidden />
      {ALIGNMENTS.map((a) => (
        <button
          key={a.value}
          className={
            editor.isActive({ textAlign: a.value })
              ? "ai-bubble-btn is-active"
              : "ai-bubble-btn"
          }
          onClick={() => editor.chain().focus().setTextAlign(a.value).run()}
          title={a.title}
        >
          {a.icon}
        </button>
      ))}
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
