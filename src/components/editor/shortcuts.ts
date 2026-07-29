"use client";

import { Extension } from "@tiptap/core";
import { promptForLink } from "./link-prompt";

/**
 * The shortcuts that belong to the product rather than to a mark (PLAN.md
 * STEP U8). `Mod-S` and `Mod-F` are not here: saving belongs to the autosave
 * hook and finding to the search bar, both of which listen for themselves —
 * they must answer even when the caret is not in the document.
 */

/**
 * `Mod-K` asks the AI where the caret is (PLAN.md STEP U11), so the link prompt
 * moved one modifier along. The keymap stays the one home for both; the prompt
 * itself is React, and a DOM event is how a ProseMirror keybinding reaches it
 * without this extension being rebuilt whenever a callback changes identity.
 */
export const CARET_PROMPT_EVENT = "docyfier:caret-prompt";

export const Shortcuts = Extension.create({
  name: "productShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-k": () => {
        this.editor.view.dom.dispatchEvent(
          new CustomEvent(CARET_PROMPT_EVENT, { bubbles: true }),
        );
        return true;
      },
      "Mod-Shift-k": () => promptForLink(this.editor),
    };
  },
});
