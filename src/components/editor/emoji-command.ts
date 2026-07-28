"use client";

import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EmojiMenuList, type EmojiMenuHandle } from "../EmojiMenu";
import { filterEmoji, type EmojiChoice } from "./emoji-items";

/**
 * The `:` picker (PLAN.md STEP U9). Same shape as the slash menu — one
 * suggestion plugin, one React list — and it inserts the character itself, so
 * nothing about it reaches the document format.
 *
 * It is only loaded when the instance's writing style welcomes emoji.
 */
export const EmojiCommand = Extension.create({
  name: "emojiCommand",

  addOptions() {
    return {
      suggestion: {
        // Every suggestion plugin needs a key of its own: two sharing the
        // default one are two instances of the same key, which ProseMirror
        // refuses outright — the editor then fails to mount at all.
        pluginKey: new PluginKey("emojiSuggestion"),
        char: ":",
        startOfLine: false,
        // Two characters before offering anything: ":" opens far too often in
        // ordinary prose ("Note: ...") to interrupt on the first keystroke.
        allow: ({ state, range }) =>
          state.doc.textBetween(range.from, range.to).length >= 3,
        items: ({ query }) => filterEmoji(query),
        command: ({ editor, range, props }) =>
          editor.chain().focus().deleteRange(range).insertContent(props.character).run(),
        render: renderEmojiMenu,
      } satisfies Partial<SuggestionOptions<EmojiChoice>>,
    };
  },

  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});

function renderEmojiMenu() {
  let root: Root | null = null;
  let handle: EmojiMenuHandle | null = null;
  let unmount: (() => void) | null = null;

  const paint = (props: SuggestionProps<EmojiChoice>) => {
    root?.render(
      createElement(EmojiMenuList, {
        ref: (h: EmojiMenuHandle | null) => {
          handle = h;
        },
        items: props.items,
        command: (item) => props.command(item),
      }),
    );
  };

  return {
    onStart: (props: SuggestionProps<EmojiChoice>) => {
      const element = document.createElement("div");
      root = createRoot(element);
      paint(props);
      unmount = props.mount(element);
    },
    onUpdate: paint,
    onKeyDown: ({ view, event }: SuggestionKeyDownProps) => {
      if (event.key === "Escape") {
        exitSuggestion(view);
        return true;
      }
      return handle?.onKeyDown(event) ?? false;
    },
    onExit: () => {
      unmount?.();
      handle = null;
      // Same deferral as the slash menu: teardown can land inside React's own
      // commit phase, where unmounting a root synchronously misbehaves.
      const toUnmount = root;
      root = null;
      queueMicrotask(() => toUnmount?.unmount());
    },
  };
}
