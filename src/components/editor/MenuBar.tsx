"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { THEMES, type DocumentTheme, type Theme } from "@/lib/themes";
import {
  HeadingGroup,
  InsertGroup,
  ListGroup,
  MarkGroup,
  TableGroup,
} from "./FormatGroups";
import { ShortcutHelp } from "./ShortcutHelp";
import type { SaveState } from "./save-state";

/** What the toolbar shows of an autosave in flight. */
const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

export type PanelName = "ai" | "design";

/** The document toolbar: formatting on the left, the panels and save on the right. */
export function MenuBar({
  editor,
  saveState,
  panel,
  onTogglePanel,
  theme,
  presets,
  onChangeTheme,
  onSaveNow,
}: {
  editor: Editor;
  saveState: SaveState;
  panel: PanelName | null;
  onTogglePanel: (which: PanelName) => void;
  theme: DocumentTheme;
  presets: Theme[];
  onChangeTheme: (theme: DocumentTheme) => void;
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
          {[...THEMES, ...presets].map((t) => (
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
        {SAVE_LABEL[saveState]}
      </span>
      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
