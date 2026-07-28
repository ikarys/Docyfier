import { Extension } from "@tiptap/core";
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionOptions,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { SlashMenuList, type SlashMenuHandle } from "../SlashMenu";
import { filterSlashItems, type SlashItem } from "./slash-items";

/**
 * Slash menu (PLAN.md STEP U1): type "/" to insert any block without the
 * toolbar. Popup positioning is handled by @tiptap/suggestion's built-in
 * floating-ui `mount()` helper — no separate positioning code needed here.
 */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: ({ query }) => filterSlashItems(query),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: renderSlashMenu,
      } satisfies Partial<SuggestionOptions<SlashItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

function renderSlashMenu() {
  let root: Root | null = null;
  let handle: SlashMenuHandle | null = null;
  let unmount: (() => void) | null = null;

  const paint = (props: SuggestionProps<SlashItem>) => {
    root?.render(
      createElement(SlashMenuList, {
        ref: (h: SlashMenuHandle | null) => {
          handle = h;
        },
        items: props.items,
        command: (item) => props.command(item),
      }),
    );
  };

  return {
    onStart: (props: SuggestionProps<SlashItem>) => {
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
      // Defer: editor teardown (e.g. route change) can call onExit synchronously
      // from within React's own commit phase, and React 19 warns/misbehaves on
      // a nested root.unmount() in that window.
      const toUnmount = root;
      root = null;
      queueMicrotask(() => toUnmount?.unmount());
    },
  };
}
