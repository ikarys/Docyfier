"use client";

import type { Editor } from "@tiptap/react";
import type { ReactNode } from "react";
import { promptForLink } from "../link-prompt";

interface MarkButton {
  readonly name: string;
  readonly label: string;
  readonly shown: ReactNode;
  readonly toggle: (editor: Editor) => void;
}

const MARKS: MarkButton[] = [
  {
    name: "bold",
    label: "Bold",
    shown: <strong>B</strong>,
    toggle: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    name: "italic",
    label: "Italic",
    shown: <em>I</em>,
    toggle: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    name: "underline",
    label: "Underline",
    shown: <u>U</u>,
    toggle: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    name: "strike",
    label: "Strikethrough",
    shown: <s>S</s>,
    toggle: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    name: "code",
    label: "Inline code",
    shown: "</>",
    toggle: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    name: "superscript",
    label: "Superscript",
    shown: (
      <span>
        x<sup>2</sup>
      </span>
    ),
    toggle: (editor) => editor.chain().focus().toggleSuperscript().run(),
  },
  {
    name: "subscript",
    label: "Subscript",
    shown: (
      <span>
        x<sub>2</sub>
      </span>
    ),
    toggle: (editor) => editor.chain().focus().toggleSubscript().run(),
  },
  {
    name: "badge",
    label: "Badge / pill",
    shown: "◍",
    toggle: (editor) => editor.chain().focus().toggleBadge("blue").run(),
  },
];

/** The marks a writer reaches for while typing, plus the link. */
export function MarkButtons({ editor }: { editor: Editor }) {
  return (
    <div className="tb-group">
      {MARKS.map((mark) => (
        <button
          key={mark.name}
          className={editor.isActive(mark.name) ? "tb-btn is-active" : "tb-btn"}
          onClick={() => mark.toggle(editor)}
          title={mark.label}
        >
          {mark.shown}
        </button>
      ))}
      <button
        className={editor.isActive("link") ? "tb-btn is-active" : "tb-btn"}
        onClick={() => promptForLink(editor)}
        title="Link (Mod-K)"
      >
        🔗
      </button>
    </div>
  );
}
