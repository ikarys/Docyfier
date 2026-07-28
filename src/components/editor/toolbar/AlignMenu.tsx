"use client";

import type { Editor } from "@tiptap/react";
import { PopoverMenu } from "@/components/PopoverMenu";

const ALIGNMENTS = [
  { value: "left", icon: "⯇", label: "Align left" },
  { value: "center", icon: "⯅", label: "Align center" },
  { value: "right", icon: "⯈", label: "Align right" },
];

/** Alignment of the current block — or of every cell of a selected column. */
export function AlignMenu({ editor }: { editor: Editor }) {
  const current =
    ALIGNMENTS.find(({ value }) => editor.isActive({ textAlign: value })) ?? ALIGNMENTS[0];

  return (
    <PopoverMenu
      label="Alignment"
      triggerClassName="tb-btn tb-trigger"
      trigger={
        <>
          <span aria-hidden>{current.icon}</span>
          <span aria-hidden>▾</span>
        </>
      }
    >
      {ALIGNMENTS.map((alignment) => (
        <button
          key={alignment.value}
          className={alignment.value === current.value ? "menu-row is-active" : "menu-row"}
          onClick={() => editor.chain().focus().setTextAlign(alignment.value).run()}
          role="menuitem"
        >
          <span aria-hidden>{alignment.icon}</span> {alignment.label}
        </button>
      ))}
    </PopoverMenu>
  );
}
