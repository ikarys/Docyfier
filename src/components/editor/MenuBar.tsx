"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { SaveStatus } from "./SaveStatus";
import { ShortcutHelp } from "./ShortcutHelp";
import { TableGroup } from "./TableGroup";
import { AlignMenu } from "./toolbar/AlignMenu";
import { BlockTypeMenu } from "./toolbar/BlockTypeMenu";
import { HighlightMenu, TextColorMenu } from "./toolbar/ColorMenu";
import { InsertMenu } from "./toolbar/InsertMenu";
import { MarkButtons } from "./toolbar/MarkButtons";
import { WordCount } from "./WordCount";
import type { SaveState } from "./save-state";

export type PanelName = "ai" | "design";

/**
 * The document toolbar (PLAN.md STEP U9). The left side edits the content —
 * what the caret is in, the marks, colour, alignment, and everything
 * insertable; the right side is what is not content: the length of the
 * document, what autosave is doing, the two panels and the shortcut list.
 *
 * The theme lives in the Design panel alone, and the block list belongs to
 * `slash-items.ts`: the Insert menu reads it rather than repeating it.
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
      <BlockTypeMenu editor={editor} />
      <MarkButtons editor={editor} />
      <div className="tb-group">
        <TextColorMenu editor={editor} />
        <HighlightMenu editor={editor} />
        <AlignMenu editor={editor} />
      </div>
      <div className="tb-group">
        <InsertMenu editor={editor} />
      </div>
      {editor.isActive("table") && <TableGroup editor={editor} />}
      <div className="tb-group">
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

      <div className="tb-right">
        <WordCount editor={editor} />
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
