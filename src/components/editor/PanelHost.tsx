"use client";

import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { AiPanel } from "../AiPanel";
import { DesignPanel } from "../DesignPanel";
import type { DocumentTheme, Theme } from "@/lib/themes";
import type { PanelName } from "./MenuBar";

/**
 * The one side slot the panels share. Which one is open is the shell's state;
 * what each one needs to be built is here, so the shell says `panel` and not
 * `panel === "ai" ? … : panel === "design" ? … : null`.
 */
export function PanelHost({
  panel,
  editor,
  theme,
  presets,
  onApply,
  onChangeTheme,
  onInsert,
  onClose,
}: {
  panel: PanelName | null;
  editor: Editor;
  theme: DocumentTheme;
  presets: Theme[];
  onApply: (content: JSONContent) => void;
  onChangeTheme: (theme: DocumentTheme) => void;
  onInsert: (text: string) => void;
  onClose: () => void;
}) {
  if (panel === "ai") {
    return (
      <AiPanel
        editor={editor}
        onApply={onApply}
        onChangeTheme={onChangeTheme}
        onInsert={onInsert}
        onClose={onClose}
      />
    );
  }
  if (panel === "design") {
    return (
      <DesignPanel
        editor={editor}
        theme={theme}
        presets={presets}
        onChange={onChangeTheme}
        onClose={onClose}
      />
    );
  }
  return null;
}
