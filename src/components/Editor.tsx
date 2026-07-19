"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import type { JSONContent as DocJSON } from "@tiptap/core";
import { Callout, type CalloutVariant } from "./extensions/Callout";
import { saveDocumentAction } from "@/app/actions";
import { AiPanel } from "./AiPanel";
import { SelectionAiMenu } from "./SelectionAiMenu";

type SaveState = "idle" | "saving" | "saved" | "error";

const VARIANTS: { key: CalloutVariant; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "tip", label: "Tip" },
  { key: "warn", label: "Warn" },
  { key: "danger", label: "Danger" },
];

export function DocumentEditor({
  id,
  initialContent,
}: {
  id: string;
  initialContent: JSONContent;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [panelOpen, setPanelOpen] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (editor: Editor) => {
      setSaveState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const res = await saveDocumentAction(id, editor.getJSON());
        setSaveState(res ? "saved" : "error");
      }, 700);
    },
    [id],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Callout,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder: "Write your document, or press the toolbar to add structure…",
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: { class: "doc doc-editor" },
    },
    onUpdate: ({ editor }) => scheduleSave(editor),
  });

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  if (!editor) return null;

  /** Replace the whole document with AI output and persist it. */
  const applyDocument = (content: DocJSON) => {
    editor.commands.setContent(content, { emitUpdate: false });
    scheduleSave(editor);
  };

  return (
    <div className="editor-wrap">
      <MenuBar
        editor={editor}
        saveState={saveState}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />
      <div className="editor-body" data-panel={panelOpen}>
        <main className="doc-shell">
          <article className="doc-sheet">
            <EditorContent editor={editor} />
            <SelectionAiMenu editor={editor} />
          </article>
        </main>
        {panelOpen && (
          <AiPanel
            editor={editor}
            onApply={applyDocument}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function MenuBar({
  editor,
  saveState,
  panelOpen,
  onTogglePanel,
}: {
  editor: Editor;
  saveState: SaveState;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const active = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs) ? "tb-btn is-active" : "tb-btn";

  return (
    <div className="toolbar-bar no-print">
      <div className="tb-group">
        <button
          className={active("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          H1
        </button>
        <button
          className={active("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          H2
        </button>
        <button
          className={active("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Heading 3"
        >
          H3
        </button>
      </div>

      <div className="tb-group">
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
      </div>

      <div className="tb-group">
        <button
          className={active("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          • List
        </button>
        <button
          className={active("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          1. List
        </button>
        <button
          className={active("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          ❝
        </button>
        <button
          className={active("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          Code
        </button>
      </div>

      <div className="tb-group">
        <button
          className={active("callout")}
          onClick={() => editor.chain().focus().toggleCallout("note").run()}
          title="Callout"
        >
          Callout
        </button>
        {VARIANTS.map((v) => (
          <button
            key={v.key}
            className={`tb-swatch tb-${v.key}`}
            disabled={!editor.isActive("callout")}
            onClick={() => editor.chain().focus().setCalloutVariant(v.key).run()}
            title={`Callout: ${v.label}`}
          >
            {v.label[0]}
          </button>
        ))}
      </div>

      <div className="tb-group">
        <button
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
          ▦ Table
        </button>
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
          disabled={!editor.can().addColumnAfter()}
          title="Add column"
        >
          +Col
        </button>
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().addRowAfter().run()}
          disabled={!editor.can().addRowAfter()}
          title="Add row"
        >
          +Row
        </button>
        <button
          className="tb-btn"
          onClick={() => editor.chain().focus().deleteTable().run()}
          disabled={!editor.can().deleteTable()}
          title="Delete table"
        >
          ✕Tbl
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

      <button
        className={panelOpen ? "tb-btn tb-ai is-active" : "tb-btn tb-ai"}
        onClick={onTogglePanel}
        title="AI assistant panel"
      >
        ✦ Assistant
      </button>
      <span className="save-status" data-state={saveState}>
        {saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved"
            : saveState === "error"
              ? "Save failed"
              : ""}
      </span>
    </div>
  );
}
