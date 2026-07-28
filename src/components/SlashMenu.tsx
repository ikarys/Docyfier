"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SlashItem } from "@/components/editor/slash-items";

/**
 * The slash menu itself: a list, a selection, and the keys that move it. What
 * the items are and what they insert lives in
 * `src/components/editor/slash-items.ts`.
 */

export interface SlashMenuHandle {
  onKeyDown: (event: { key: string }) => boolean;
}

export const SlashMenuList = forwardRef<
  SlashMenuHandle,
  { items: SlashItem[]; command: (item: SlashItem) => void }
>(function SlashMenuList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ key }) => {
      if (key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (key === "ArrowUp") {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (key === "Enter") {
        if (items[selected]) command(items[selected]);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return <div className="slash-menu slash-menu-empty">No matching block</div>;
  }

  return (
    <div className="slash-menu">
      {items.map((item, i) => (
        <button
          key={item.title}
          className={i === selected ? "slash-item is-selected" : "slash-item"}
          onMouseEnter={() => setSelected(i)}
          onClick={() => command(item)}
        >
          <span className="slash-item-icon">{item.icon}</span>
          <span className="slash-item-title">{item.title}</span>
        </button>
      ))}
    </div>
  );
});
