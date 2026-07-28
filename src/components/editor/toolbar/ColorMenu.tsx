"use client";

import type { Editor } from "@tiptap/react";
import { PopoverMenu } from "@/components/PopoverMenu";
import { HIGHLIGHT_COLORS, TEXT_COLORS, type Swatch } from "./palette";

/**
 * Colour and highlight, reachable from the toolbar rather than only from a
 * selection bubble nobody sees until they select something.
 */
function SwatchMenu({
  label,
  trigger,
  swatches,
  currentHex,
  onPick,
  onClear,
}: {
  label: string;
  trigger: string;
  swatches: Swatch[];
  currentHex: string | undefined;
  onPick: (hex: string) => void;
  onClear: () => void;
}) {
  return (
    <PopoverMenu
      label={label}
      triggerClassName="tb-btn tb-trigger"
      trigger={
        <>
          <span style={currentHex ? { color: currentHex } : undefined}>{trigger}</span>
          <span aria-hidden>▾</span>
        </>
      }
      className="tb-popover"
    >
      <div className="swatch-row">
        {swatches.map((swatch) => (
          <button
            key={swatch.hex}
            className={
              swatch.hex.toLowerCase() === currentHex?.toLowerCase()
                ? "swatch is-active"
                : "swatch"
            }
            style={{ background: swatch.hex }}
            title={swatch.label}
            aria-label={swatch.label}
            onClick={() => onPick(swatch.hex)}
          />
        ))}
      </div>
      <button className="menu-row" onClick={onClear} role="menuitem">
        None
      </button>
    </PopoverMenu>
  );
}

export function TextColorMenu({ editor }: { editor: Editor }) {
  return (
    <SwatchMenu
      label="Text color"
      trigger="A"
      swatches={TEXT_COLORS}
      currentHex={editor.getAttributes("textStyle").color as string | undefined}
      onPick={(hex) => editor.chain().focus().setColor(hex).run()}
      onClear={() => editor.chain().focus().unsetColor().run()}
    />
  );
}

export function HighlightMenu({ editor }: { editor: Editor }) {
  return (
    <SwatchMenu
      label="Highlight"
      trigger="✐"
      swatches={HIGHLIGHT_COLORS}
      currentHex={editor.getAttributes("highlight").color as string | undefined}
      onPick={(hex) => editor.chain().focus().setHighlight({ color: hex }).run()}
      onClear={() => editor.chain().focus().unsetHighlight().run()}
    />
  );
}
