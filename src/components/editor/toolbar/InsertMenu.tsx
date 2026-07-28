"use client";

import type { Editor } from "@tiptap/react";
import { PopoverMenu } from "@/components/PopoverMenu";
import { SLASH_ITEMS } from "../slash-items";

/**
 * Everything insertable, from the toolbar. The list is the slash menu's own —
 * one registry, two ways in, so a block added to `slash-items.ts` appears here
 * without anyone remembering to.
 */
export function InsertMenu({ editor }: { editor: Editor }) {
  const at = editor.state.selection.from;

  return (
    <PopoverMenu
      label="Insert a block"
      triggerClassName="tb-btn tb-trigger"
      trigger={
        <>
          + Insert <span aria-hidden>▾</span>
        </>
      }
      className="tb-popover-wide"
    >
      <div className="insert-grid">
        {SLASH_ITEMS.map((item) => (
          <button
            key={item.title}
            className="menu-row insert-item"
            role="menuitem"
            // The slash command deletes the "/…" it was typed with; from here
            // there is nothing to delete, so the range is the caret itself.
            onClick={() => item.command({ editor, range: { from: at, to: at } })}
          >
            <span className="insert-icon" aria-hidden>
              {item.icon}
            </span>
            {item.title}
          </button>
        ))}
      </div>
    </PopoverMenu>
  );
}
