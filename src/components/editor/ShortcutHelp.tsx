"use client";

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "/", label: "Insert a block (headings, tables, cards…)" },
  { keys: "Mod-F", label: "Find and replace in the document" },
  { keys: "Mod-S", label: "Save now (saving is automatic anyway)" },
  { keys: "Mod-K", label: "Link the selection" },
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
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
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
