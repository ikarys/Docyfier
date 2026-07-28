"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { EmojiChoice } from "@/components/editor/emoji-items";

/**
 * The `:` picker itself: a row of characters, a selection, and the keys that
 * move it. Which emoji are offered lives in
 * `src/components/editor/emoji-items.ts`.
 */

export interface EmojiMenuHandle {
  onKeyDown: (event: { key: string }) => boolean;
}

export const EmojiMenuList = forwardRef<
  EmojiMenuHandle,
  { items: EmojiChoice[]; command: (item: EmojiChoice) => void }
>(function EmojiMenuList({ items, command }, ref) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ key }) => {
      if (key === "ArrowDown" || key === "ArrowRight") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (key === "ArrowUp" || key === "ArrowLeft") {
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

  if (items.length === 0) return null;

  return (
    <div className="emoji-menu">
      {items.map((item, i) => (
        <button
          key={item.name}
          className={i === selected ? "emoji-item is-selected" : "emoji-item"}
          onMouseEnter={() => setSelected(i)}
          onClick={() => command(item)}
          title={`:${item.name}:`}
        >
          {item.character}
        </button>
      ))}
    </div>
  );
});
