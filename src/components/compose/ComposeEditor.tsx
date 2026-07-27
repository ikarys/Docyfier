"use client";

import { useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";

/**
 * The editor a composer writes into and gets its answer back in.
 *
 * A deliberately small editor: the block set is what a ticket or an email can
 * carry and what every destination can be given — headings, emphasis, lists,
 * quotes, code, tables. None of the document furniture (cover, charts, cards,
 * slash menu, autosave) belongs here; a composer's output leaves through the
 * clipboard, not through a stored document.
 */
export function useComposeEditor(placeholder: string) {
  // Stable identity: an inline `.configure(...)` would hand `useEditor` a new
  // extension list on every render.
  const extensions = useRef([
    StarterKit.configure({
      link: { openOnClick: false },
      heading: { levels: [1, 2, 3] },
    }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Placeholder.configure({ placeholder }),
  ]).current;

  return useEditor({
    immediatelyRender: false,
    extensions,
    editorProps: { attributes: { class: "doc compose-doc" } },
  });
}

/** Toolbar + surface. The editor instance is owned by the form, which reads it
 * on submit and on copy. */
export function ComposeEditor({ editor }: { editor: Editor | null }) {
  if (!editor) return <div className="compose-editor" />;

  const active = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? "tb-btn is-active" : "tb-btn";

  return (
    <div className="compose-editor">
      <div className="compose-editor-bar">
        <div className="tb-group">
          <button
            type="button"
            className={active("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Section heading"
          >
            H2
          </button>
          <button
            type="button"
            className={active("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Sub-heading"
          >
            H3
          </button>
        </div>

        <div className="tb-group">
          <button
            type="button"
            className={active("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={active("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={active("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline code"
          >
            {"</>"}
          </button>
        </div>

        <div className="tb-group">
          <button
            type="button"
            className={active("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet list"
          >
            • List
          </button>
          <button
            type="button"
            className={active("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered list"
          >
            1. List
          </button>
          <button
            type="button"
            className={active("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            ❝
          </button>
          <button
            type="button"
            className={active("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
          >
            {"{ }"}
          </button>
        </div>

        <div className="tb-group">
          <button
            type="button"
            className="tb-btn"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            title="Insert table"
          >
            ▦
          </button>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
