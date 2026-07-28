"use client";

import { useRef, useState } from "react";
import { useEditor, type JSONContent } from "@tiptap/react";
import type { JSONContent as DocJSON } from "@tiptap/core";
import { imageFilesOf, insertUploadedImages } from "@/components/editor/image-upload";
import { resolveTokens, tokenStyle, type DocumentTheme } from "@/lib/themes";
import { AiPanel } from "./AiPanel";
import { AiDiffBar } from "./AiDiffBar";
import { DesignPanel } from "./DesignPanel";
import { EditorSurface } from "./editor/EditorSurface";
import { EDITOR_EXTENSIONS } from "./editor/extensions";
import { MenuBar, type PanelName } from "./editor/MenuBar";
import { useAiReview } from "./editor/useAiReview";
import { useAutosave, type Autosave } from "./editor/useAutosave";
import { useDocumentTheme } from "./editor/useDocumentTheme";
import { useStreamedGeneration } from "./editor/useStreamedGeneration";

/**
 * The document editor shell: the Tiptap instance, the sheet, and the panels
 * around it. Saving, streaming generation and AI review each live in their own
 * hook — this component wires them together and renders.
 */

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
  /** Only one side panel at a time — they share the same slot. */
  const [panel, setPanel] = useState<PanelName | null>("ai");
  const { theme, changeTheme } = useDocumentTheme(id, initialTheme);
  /** The editor is created before the hook that saves it, and its `onUpdate`
   * only fires once both exist — hence the indirection rather than an order. */
  const autosaveRef = useRef<Autosave | null>(null);

  // Stable identity: inline `.configure(...)` calls would otherwise return a new
  // extension instance every render, which made useEditor think the config
  // changed and re-apply editor options on every save-state re-render.
  const extensions = useRef(EDITOR_EXTENSIONS).current;

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
    onUpdate: ({ editor }) => autosaveRef.current?.scheduleSave(editor),
  });

  const autosave = useAutosave(id, editor, initialUpdatedAt);
  autosaveRef.current = autosave;
  const generation = useStreamedGeneration(id, editor, autosave, changeTheme);
  const review = useAiReview(editor, autosave);

  if (!editor) return null;

  /** Replace the whole document with AI output, under review. */
  const applyDocument = (content: DocJSON) =>
    review.run(() => editor.commands.setContent(content, { emitUpdate: false }));

  return (
    <div className="editor-wrap">
      <MenuBar
        editor={editor}
        saveState={autosave.saveState}
        panel={panel}
        onTogglePanel={(which) => setPanel((p) => (p === which ? null : which))}
        theme={theme}
        onChangeTheme={changeTheme}
        onSaveNow={autosave.saveNow}
      />
      <div className="editor-body" data-panel={panel !== null}>
        <main
          className="doc-shell"
          data-theme={theme.preset}
          style={tokenStyle(resolveTokens(theme))}
        >
          <EditorSurface
            editor={editor}
            generating={generation.streamed === 0}
            onAiEdit={review.run}
          />
        </main>
        {panel === "ai" && (
          <AiPanel
            editor={editor}
            onApply={applyDocument}
            onChangeTheme={changeTheme}
            onClose={() => setPanel(null)}
          />
        )}
        {panel === "design" && (
          <DesignPanel
            editor={editor}
            theme={theme}
            onChange={changeTheme}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
      {review.changed !== null && (
        <AiDiffBar
          count={review.changed}
          onAccept={review.accept}
          onReject={review.reject}
        />
      )}
      {generation.error && (
        <div className="gen-error-bar no-print" role="alert">
          <span className="ai-diff-bar-label">{generation.error}</span>
          <button className="btn" onClick={generation.dismissError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
