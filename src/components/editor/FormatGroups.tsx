"use client";

import type { Editor } from "@tiptap/react";

/**
 * The toolbar buttons that act on the caret: headings, marks, lists, tables.
 *
 * Block insertion lives in the slash menu (STEP U1); what stays here is what a
 * user reaches for while typing, plus the table controls, which only appear
 * when the caret is actually inside a table.
 */

function activeClass(editor: Editor, name: string, attrs?: Record<string, unknown>) {
  return editor.isActive(name, attrs) ? "tb-btn is-active" : "tb-btn";
}

export function HeadingGroup({ editor }: { editor: Editor }) {
  return (
    <div className="tb-group">
      {[1, 2, 3].map((level) => (
        <button
          key={level}
          className={activeClass(editor, "heading", { level })}
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({ level: level as 1 | 2 | 3 })
              .run()
          }
          title={`Heading ${level}`}
        >
          H{level}
        </button>
      ))}
    </div>
  );
}

export function MarkGroup({ editor }: { editor: Editor }) {
  return (
    <div className="tb-group">
      <button
        className={activeClass(editor, "bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        className={activeClass(editor, "italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        className={activeClass(editor, "strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <button
        className={activeClass(editor, "code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        {"</>"}
      </button>
    </div>
  );
}

export function ListGroup({ editor }: { editor: Editor }) {
  return (
    <div className="tb-group">
      <button
        className={activeClass(editor, "bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        • List
      </button>
      <button
        className={activeClass(editor, "orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        1. List
      </button>
      <button
        className={activeClass(editor, "blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        ❝
      </button>
      <button
        className={activeClass(editor, "codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        Code
      </button>
    </div>
  );
}

export function InsertGroup({ editor }: { editor: Editor }) {
  return (
    <>
      <div className="tb-group">
        <button
          className={activeClass(editor, "badge")}
          onClick={() => editor.chain().focus().toggleBadge("blue").run()}
          title="Badge / pill on selection"
        >
          Pill
        </button>
      </div>
      <div className="tb-group">
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          —
        </button>
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          ↶
        </button>
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          ↷
        </button>
      </div>
    </>
  );
}
