"use client";

import type { Editor } from "@tiptap/react";
import { PopoverMenu } from "@/components/PopoverMenu";
import { BLOCK_TYPES, currentBlockType } from "./block-type";

/** What the caret is in, and what it can become — one control for eight types. */
export function BlockTypeMenu({ editor }: { editor: Editor }) {
  const current = currentBlockType((name, attrs) => editor.isActive(name, attrs));

  return (
    <PopoverMenu
      label="Block type"
      triggerClassName="tb-btn tb-trigger tb-trigger-wide"
      trigger={
        <>
          {current.label} <span aria-hidden>▾</span>
        </>
      }
    >
      {BLOCK_TYPES.map((type) => (
        <button
          key={type.id}
          className={type.id === current.id ? "menu-row is-active" : "menu-row"}
          onClick={() => type.apply(editor)}
          role="menuitem"
        >
          {type.label}
          <span className="menu-row-hint">{type.hint}</span>
        </button>
      ))}
    </PopoverMenu>
  );
}
