"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  HeadingGroup,
  InsertGroup,
  ListGroup,
  MarkGroup,
  TableGroup,
} from "./FormatGroups";
import { SaveStatus } from "./SaveStatus";
import { ShortcutHelp } from "./ShortcutHelp";
import type { SaveState } from "./save-state";

export type PanelName = "ai" | "design";

/**
 * The document toolbar. The left side edits the content, the right side is
 * everything that is not content: what autosave is doing, the two panels — one
 * open at a time, hence a segmented pair — and the shortcut list.
 *
 * The theme lives in the Design panel alone: one home per decision, and the
 * panel already holds the preset grid the toolbar's picker duplicated.
 */
export function MenuBar({
  editor,
  saveState,
  panel,
  onTogglePanel,
  onSaveNow,
}: {
  editor: Editor;
  saveState: SaveState;
  panel: PanelName | null;
  onTogglePanel: (which: PanelName) => void;
  onSaveNow: () => void;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="toolbar-bar no-print">
      <HeadingGroup editor={editor} />
      <MarkGroup editor={editor} />
      <ListGroup editor={editor} />
      {editor.isActive("table") && <TableGroup editor={editor} />}
      <InsertGroup editor={editor} />

      <div className="tb-right">
        <SaveStatus state={saveState} onRetry={onSaveNow} />
        <div className="tb-panels" role="group" aria-label="Panels">
          <button
            className={panel === "design" ? "tb-btn is-active" : "tb-btn"}
            onClick={() => onTogglePanel("design")}
            aria-pressed={panel === "design"}
            title="Design panel — theme, accent, fonts, density"
          >
            ◐ Design
          </button>
          <button
            className={panel === "ai" ? "tb-btn is-active" : "tb-btn"}
            onClick={() => onTogglePanel("ai")}
            aria-pressed={panel === "ai"}
            title="AI assistant panel"
          >
            ✦ Assistant
          </button>
        </div>
        <button
          className="tb-btn"
          onClick={() => setHelpOpen(true)}
          title="Keyboard shortcuts"
        >
          ?
        </button>
      </div>

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
