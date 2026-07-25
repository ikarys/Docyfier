"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor, type JSONContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import type { JSONContent as DocJSON } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Callout } from "./extensions/Callout";
import { Badge } from "./extensions/Badge";
import { CardGrid, Card } from "./extensions/Cards";
import { ColumnList, Column } from "./extensions/Columns";
import { StatRow, Stat } from "./extensions/Stats";
import { Timeline, TimelineItem } from "./extensions/Timeline";
import { StepList, Step } from "./extensions/Steps";
import { Pyramid, PyramidTier } from "./extensions/Pyramid";
import { SlashCommand } from "./extensions/SlashCommand";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { saveDocumentAction, setDocumentThemeAction } from "@/app/actions";
import { THEMES } from "@/lib/themes";
import { AiPanel } from "./AiPanel";
import { SelectionAiMenu } from "./SelectionAiMenu";

type SaveState = "idle" | "saving" | "saved" | "error";

export function DocumentEditor({
  id,
  initialContent,
  initialTheme,
}: {
  id: string;
  initialContent: JSONContent;
  initialTheme: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [panelOpen, setPanelOpen] = useState(true);
  const [theme, setTheme] = useState(initialTheme);
  /** Position of the top-level block currently under the drag handle. */
  const [hoveredBlock, setHoveredBlock] = useState<{ pos: number; size: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest editor JSON awaiting a debounced write; null when nothing pending. */
  const pending = useRef<JSONContent | null>(null);

  /** Write any pending content immediately, cancelling the debounce. */
  const flushSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const content = pending.current;
    if (content === null) return;
    pending.current = null;
    void saveDocumentAction(id, content).then((res) =>
      setSaveState(res ? "saved" : "error"),
    );
  }, [id]);

  // Stable identity: DragHandle re-registers its ProseMirror plugin whenever
  // this callback's reference changes, so an inline arrow here would loop.
  const onDragNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) =>
      setHoveredBlock(node ? { pos, size: node.nodeSize } : null),
    [],
  );

  const changeTheme = useCallback(
    (next: string) => {
      setTheme(next);
      void setDocumentThemeAction(id, next);
    },
    [id],
  );

  const scheduleSave = useCallback(
    (editor: Editor) => {
      setSaveState("saving");
      pending.current = editor.getJSON();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushSave(), 700);
    },
    [flushSave],
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
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Badge,
      CardGrid,
      Card,
      ColumnList,
      Column,
      StatRow,
      Stat,
      Timeline,
      TimelineItem,
      StepList,
      Step,
      Pyramid,
      PyramidTier,
      SlashCommand,
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

  // Flush on unmount (in-app navigation) and on tab hide so edits made in the
  // debounce window aren't lost when the user leaves the document.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flushSave();
    };
  }, [flushSave]);

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
        theme={theme}
        onChangeTheme={changeTheme}
      />
      <div className="editor-body" data-panel={panelOpen}>
        <main className="doc-shell" data-theme={theme}>
          <article className="doc-sheet">
            <EditorContent editor={editor} />
            <SelectionAiMenu editor={editor} />
            <DragHandle
              editor={editor}
              className="drag-handle no-print"
              onNodeChange={onDragNodeChange}
            >
              <div className="drag-handle-controls">
                <button
                  type="button"
                  className="drag-handle-btn"
                  title="Insert block below"
                  onClick={() => {
                    if (!hoveredBlock) return;
                    const insertPos = hoveredBlock.pos + hoveredBlock.size;
                    editor
                      .chain()
                      .focus()
                      .insertContentAt(insertPos, { type: "paragraph" })
                      .setTextSelection(insertPos + 1)
                      .insertContent("/")
                      .run();
                  }}
                >
                  +
                </button>
                <span className="drag-handle-grip" title="Drag to reorder">
                  ⋮⋮
                </span>
              </div>
            </DragHandle>
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
  theme,
  onChangeTheme,
}: {
  editor: Editor;
  saveState: SaveState;
  panelOpen: boolean;
  onTogglePanel: () => void;
  theme: string;
  onChangeTheme: (theme: string) => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
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

      {editor.isActive("table") && (
        <div className="tb-group">
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
      )}

      <div className="tb-group">
        <button
          className={active("badge")}
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

      <div className="tb-group tb-theme">
        <label className="tb-theme-label" htmlFor="theme-select">
          Theme
        </label>
        <select
          id="theme-select"
          className="tb-select"
          value={theme}
          onChange={(e) => onChangeTheme(e.target.value)}
          title="Document theme"
        >
          {THEMES.map((t) => (
            <option key={t.id} value={t.id} title={t.hint}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <button
        className="tb-btn"
        onClick={() => setHelpOpen(true)}
        title="Keyboard shortcuts"
      >
        ?
      </button>
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
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "/", label: "Insert a block (headings, tables, cards…)" },
  { keys: "Mod-B", label: "Bold" },
  { keys: "Mod-I", label: "Italic" },
  { keys: "Mod-Shift-S", label: "Strikethrough" },
  { keys: "Mod-E", label: "Inline code" },
  { keys: "Mod-Alt-1/2/3", label: "Heading 1 / 2 / 3" },
  { keys: "Mod-Shift-8", label: "Bullet list" },
  { keys: "Mod-Shift-7", label: "Numbered list" },
  { keys: "Mod-Shift-B", label: "Quote" },
  { keys: "Mod-Alt-C", label: "Code block" },
  { keys: "Mod-Z", label: "Undo" },
  { keys: "Mod-Shift-Z", label: "Redo" },
];

/** Static overlay listing keyboard shortcuts (Tiptap defaults + the "/" slash menu). */
function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-overlay no-print" onClick={onClose}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()}>
        <div className="help-panel-header">
          <h2>Keyboard shortcuts</h2>
          <button className="tb-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <dl className="help-list">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="help-row">
              <dt>
                <kbd>{s.keys}</kbd>
              </dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
