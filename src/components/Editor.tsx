"use client";

// KaTeX ships the fonts and metrics its own rendering needs; the editor is the
// only surface that draws a formula, so the stylesheet loads with it.
import "katex/dist/katex.min.css";
import { useRef, useState } from "react";
import { useEditor, type JSONContent } from "@tiptap/react";
import type { JSONContent as DocJSON } from "@tiptap/core";
import {
  presetSkin,
  resolveTokens,
  tokenStyle,
  type DocumentTheme,
  type Theme,
} from "@/lib/themes";
import { documentEditorProps } from "./editor/editor-props";
import { EditorNotices } from "./editor/EditorNotices";
import { EditorSurface } from "./editor/EditorSurface";
import { editorExtensions } from "./editor/extensions";
import { MenuBar, type PanelName } from "./editor/MenuBar";
import { PanelHost } from "./editor/PanelHost";
import { SearchBar } from "./editor/SearchBar";
import { useAiReview } from "./editor/useAiReview";
import { useDocumentSearch } from "./editor/useDocumentSearch";
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
  presets,
  smartTypography,
  emoji,
}: {
  id: string;
  initialContent: JSONContent;
  initialTheme: DocumentTheme;
  initialUpdatedAt: string;
  /** The presets this instance saved, so a document wearing one resolves it. */
  presets: Theme[];
  /** From the instance's writing style: what a keystroke produces. */
  smartTypography: boolean;
  /** From the same settings: whether `:` offers emoji. */
  emoji: boolean;
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
  const extensions = useRef(editorExtensions({ smartTypography, emoji })).current;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialContent,
    editorProps: documentEditorProps(),
    onUpdate: ({ editor }) => autosaveRef.current?.scheduleSave(editor),
  });

  const autosave = useAutosave(id, editor, initialUpdatedAt);
  autosaveRef.current = autosave;
  const generation = useStreamedGeneration(id, editor, autosave, changeTheme);
  const review = useAiReview(editor, autosave);
  const search = useDocumentSearch(editor);

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
        onSaveNow={autosave.saveNow}
      />
      {search.open && <SearchBar search={search} />}
      <div className="editor-body" data-panel={panel !== null}>
        <main
          className="doc-shell"
          data-theme={presetSkin(theme.preset, presets)}
          style={tokenStyle(resolveTokens(theme, presets))}
        >
          <EditorSurface
            editor={editor}
            generating={generation.streamed === 0}
            onAiEdit={review.run}
          />
        </main>
        <PanelHost
          panel={panel}
          editor={editor}
          theme={theme}
          presets={presets}
          onApply={applyDocument}
          onChangeTheme={changeTheme}
          onClose={() => setPanel(null)}
        />
      </div>
      <EditorNotices review={review} generation={generation} />
    </div>
  );
}
