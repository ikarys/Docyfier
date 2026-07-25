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
import { ChartNode } from "./ChartView";
import { ImageNode } from "./ImageView";
import { TocNode } from "./TocView";
import { DocCover, CoverLine } from "./extensions/Cover";
import { PageBreak } from "./extensions/PageBreak";
import { TextAlign } from "@tiptap/extension-text-align";
import { SlashCommand } from "./extensions/SlashCommand";
import { AiDiff } from "./extensions/AiDiff";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { saveDocumentAction, setDocumentThemeAction } from "@/app/actions";
import { toPlainJSON } from "@/lib/doc/plain";
import { changedBlocks } from "@/lib/doc/diff";
import { imageFilesOf, insertUploadedImages } from "@/lib/doc/upload";
import {
  THEMES,
  resolveTokens,
  tokenStyle,
  type DocumentTheme,
} from "@/lib/themes";
import { AiPanel } from "./AiPanel";
import { AiDiffBar } from "./AiDiffBar";
import { DesignPanel } from "./DesignPanel";
import { SelectionAiMenu } from "./SelectionAiMenu";

type SaveState = "idle" | "saving" | "saved" | "error";

/** A local copy of unsaved edits, keyed by document.
 *
 * `base` is the server `updatedAt` the draft was typed on top of: if the server
 * has moved past it the write landed and the draft is stale. Reloading the tab
 * kills any in-flight save, so this synchronous copy is what makes a refresh
 * during the autosave debounce non-destructive. */
type Draft = { base: string; content: JSONContent };

const DRAFT_PREFIX = "docyfier:draft:";

function readDraft(id: string): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_PREFIX + id);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function DocumentEditor({
  id,
  initialContent,
  initialTheme,
  initialUpdatedAt,
}: {
  id: string;
  initialContent: JSONContent;
  initialTheme: DocumentTheme;
  initialUpdatedAt: string;
}) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  /** Only one side panel at a time — they share the same slot. */
  const [panel, setPanel] = useState<"ai" | "design" | null>("ai");
  const [theme, setTheme] = useState(initialTheme);
  /** Number of blocks an AI edit changed, while its review bar is open. */
  const [aiChanged, setAiChanged] = useState<number | null>(null);
  /** The document as it stood before that edit — what Reject restores. */
  const aiSnapshot = useRef<JSONContent | null>(null);
  /** Position of the top-level block currently under the drag handle. */
  const [hoveredBlock, setHoveredBlock] = useState<{ pos: number; size: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Theme writes are debounced too: the accent color input fires per pixel. */
  const themeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latest editor JSON not yet known to be on the server; null when in sync. */
  const pending = useRef<JSONContent | null>(null);
  /** Server `updatedAt` of the last write we know landed. */
  const baseVersion = useRef(initialUpdatedAt);

  const writeDraft = useCallback(
    (content: JSONContent) => {
      try {
        window.localStorage.setItem(
          DRAFT_PREFIX + id,
          JSON.stringify({ base: baseVersion.current, content } satisfies Draft),
        );
      } catch {
        // Quota or private mode: the server save is still the real path.
      }
    },
    [id],
  );

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(DRAFT_PREFIX + id);
    } catch {
      // ignore
    }
  }, [id]);

  /** Write any pending content immediately, cancelling the debounce. */
  const flushSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const content = pending.current;
    if (content === null) return;
    setSaveState("saving");
    // `pending` is cleared only once the server confirms, so a failed or
    // interrupted save leaves the content queued instead of dropping it.
    void saveDocumentAction(id, content)
      .then((res) => {
        if (!res) {
          setSaveState("error");
          return;
        }
        baseVersion.current = res.updatedAt;
        setSaveState("saved");
        if (pending.current === content) {
          pending.current = null;
          clearDraft();
        }
      })
      .catch(() => setSaveState("error"));
  }, [id, clearDraft]);

  // Stable identity: DragHandle re-registers its ProseMirror plugin whenever
  // this callback's reference changes, so an inline arrow here would loop.
  const onDragNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) =>
      setHoveredBlock(node ? { pos, size: node.nodeSize } : null),
    [],
  );

  const changeTheme = useCallback(
    (next: DocumentTheme) => {
      setTheme(next);
      if (themeTimer.current) clearTimeout(themeTimer.current);
      themeTimer.current = setTimeout(() => {
        void setDocumentThemeAction(id, next);
      }, 400);
    },
    [id],
  );

  const scheduleSave = useCallback(
    (editor: Editor) => {
      setSaveState("saving");
      const content = toPlainJSON(editor.getJSON());
      pending.current = content;
      writeDraft(content);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushSave(), 700);
    },
    [flushSave, writeDraft],
  );

  // Stable identity: inline `.configure(...)` calls would otherwise return a new
  // extension instance every render, which made useEditor think the config
  // changed and re-apply editor options on every save-state re-render.
  const extensions = useRef([
    // Link ships in StarterKit v3; inside the editor a click must place the
    // caret, not navigate away from the document being written.
    StarterKit.configure({ link: { openOnClick: false } }),
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
    ChartNode,
    ImageNode,
    TocNode,
    DocCover,
    CoverLine,
    PageBreak,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    SlashCommand,
    AiDiff,
    Placeholder.configure({
      placeholder: "Write your document, or press the toolbar to add structure…",
    }),
  ]).current;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editorProps: {
      attributes: { class: "doc doc-editor" },
      // Images arrive by paste or drop, are uploaded, then inserted by URL.
      // Returning true swallows the event so ProseMirror does not also insert
      // the browser's own (base64 or file://) representation.
      handlePaste: (view, event) => {
        const files = imageFilesOf(event.clipboardData?.files ?? null);
        if (files.length === 0) return false;
        void insertUploadedImages(view, files, view.state.selection.from);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFilesOf(event.dataTransfer?.files ?? null);
        if (files.length === 0) return false;
        const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void insertUploadedImages(view, files, at?.pos ?? view.state.selection.from);
        return true;
      },
    },
    onUpdate: ({ editor }) => scheduleSave(editor),
  });

  // Flush on unmount (in-app navigation), on tab hide, and on pagehide — a
  // reload or tab close fires `pagehide` but neither `visibilitychange` on all
  // browsers nor React cleanup, and it kills the in-flight request either way.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    const onPageHide = () => flushSave();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushSave();
    };
  }, [flushSave]);

  // Recover edits that never reached the server (reload mid-debounce, offline,
  // crashed tab). The draft only wins while the server is still on the version
  // it was typed against; anything older is a landed save and gets dropped.
  const restored = useRef(false);
  useEffect(() => {
    if (!editor || restored.current) return;
    restored.current = true;
    const draft = readDraft(id);
    if (!draft) return;
    if (draft.base !== baseVersion.current) {
      clearDraft();
      return;
    }
    editor.commands.setContent(draft.content, { emitUpdate: false });
    pending.current = draft.content;
    flushSave();
  }, [editor, id, clearDraft, flushSave]);

  if (!editor) return null;

  /** Save the current editor content right away, bypassing the debounce. */
  const saveNow = () => {
    const content = toPlainJSON(editor.getJSON());
    pending.current = content;
    writeDraft(content);
    flushSave();
  };

  /**
   * Run an AI edit, then open the review bar over the blocks it touched.
   *
   * The result is saved immediately, as every AI apply was before: a review
   * that held the change in memory would lose it on a reload, and Reject
   * restores the snapshot exactly either way.
   */
  const runAiEdit = (apply: () => void) => {
    const before = toPlainJSON(editor.getJSON());
    apply();
    const marks = changedBlocks(before, toPlainJSON(editor.getJSON()));
    const changed = marks.filter((m) => m !== "same").length;
    saveNow();
    if (changed === 0) return;
    aiSnapshot.current = before;
    editor.commands.setAiDiff(marks);
    setAiChanged(changed);
  };

  /** Replace the whole document with AI output, under review. */
  const applyDocument = (content: DocJSON) =>
    runAiEdit(() => editor.commands.setContent(content, { emitUpdate: false }));

  const acceptAiEdit = () => {
    editor.commands.clearAiDiff();
    aiSnapshot.current = null;
    setAiChanged(null);
  };

  const rejectAiEdit = () => {
    const snapshot = aiSnapshot.current;
    if (snapshot) editor.commands.setContent(snapshot, { emitUpdate: false });
    editor.commands.clearAiDiff();
    aiSnapshot.current = null;
    setAiChanged(null);
    saveNow();
  };

  return (
    <div className="editor-wrap">
      <MenuBar
        editor={editor}
        saveState={saveState}
        panel={panel}
        onTogglePanel={(which) => setPanel((p) => (p === which ? null : which))}
        theme={theme}
        onChangeTheme={changeTheme}
        onSaveNow={saveNow}
      />
      <div className="editor-body" data-panel={panel !== null}>
        <main
          className="doc-shell"
          data-theme={theme.preset}
          style={tokenStyle(resolveTokens(theme))}
        >
          <article className="doc-sheet">
            <EditorContent editor={editor} />
            <SelectionAiMenu editor={editor} onAiEdit={runAiEdit} />
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
        {panel === "ai" && (
          <AiPanel
            editor={editor}
            onApply={applyDocument}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "design" && (
          <DesignPanel
            theme={theme}
            onChange={changeTheme}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
      {aiChanged !== null && (
        <AiDiffBar
          count={aiChanged}
          onAccept={acceptAiEdit}
          onReject={rejectAiEdit}
        />
      )}
    </div>
  );
}

function MenuBar({
  editor,
  saveState,
  panel,
  onTogglePanel,
  theme,
  onChangeTheme,
  onSaveNow,
}: {
  editor: Editor;
  saveState: SaveState;
  panel: "ai" | "design" | null;
  onTogglePanel: (which: "ai" | "design") => void;
  theme: DocumentTheme;
  onChangeTheme: (theme: DocumentTheme) => void;
  onSaveNow: () => void;
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
          value={theme.preset}
          onChange={(e) => onChangeTheme({ ...theme, preset: e.target.value })}
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
        className={panel === "design" ? "tb-btn tb-ai is-active" : "tb-btn tb-ai"}
        onClick={() => onTogglePanel("design")}
        title="Design panel — accent, fonts, density"
      >
        ◐ Design
      </button>
      <button
        className={panel === "ai" ? "tb-btn is-active" : "tb-btn"}
        onClick={() => onTogglePanel("ai")}
        title="AI assistant panel"
      >
        ✦ Assistant
      </button>
      <button className="tb-btn" onClick={onSaveNow} title="Save now">
        Save
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
