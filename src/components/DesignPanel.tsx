"use client";

import type { Editor } from "@tiptap/react";
import { RestyleButton } from "@/components/design/RestyleButton";
import { ThemeControls } from "@/components/design/ThemeControls";
import { useRestyle } from "@/components/editor/useRestyle";
import type { DocumentTheme, Theme } from "@/lib/themes";

/**
 * Surface for STEP U3: the design side panel. It edits **tokens only** — the
 * document JSON is never touched, so switching a font or an accent can never
 * lose content. A change that equals the preset's own value is stored as an
 * override anyway; "Reset to preset" is the way back.
 *
 * The art direction the model proposes (STEP U7) arrives through the same
 * `onChange`: a suggestion, overridable by every control above it.
 */
export function DesignPanel({
  editor,
  theme,
  presets,
  onChange,
  onClose,
}: {
  editor: Editor;
  theme: DocumentTheme;
  presets: Theme[];
  onChange: (theme: DocumentTheme) => void;
  onClose: () => void;
}) {
  const restyle = useRestyle(editor, onChange);

  return (
    <aside className="ai-panel design-panel no-print">
      <div className="ai-panel-head">
        <span className="ai-panel-title">◐ Design</span>
        <button className="ai-panel-close" onClick={onClose} title="Close panel">
          ✕
        </button>
      </div>

      <div className="design-body">
        <ThemeControls theme={theme} presets={presets} onChange={onChange} />

        <RestyleButton restyle={restyle} />

        <p className="design-hint">
          Design is presentation only — none of these controls change the
          document&apos;s content, and every one of them prints.
        </p>
      </div>
    </aside>
  );
}
