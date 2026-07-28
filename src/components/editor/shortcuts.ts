"use client";

import { Extension } from "@tiptap/core";
import { promptForLink } from "./link-prompt";

/**
 * The shortcuts that belong to the product rather than to a mark (PLAN.md
 * STEP U8). `Mod-S` and `Mod-F` are not here: saving belongs to the autosave
 * hook and finding to the search bar, both of which listen for themselves —
 * they must answer even when the caret is not in the document.
 */
export const Shortcuts = Extension.create({
  name: "productShortcuts",

  addKeyboardShortcuts() {
    return {
      "Mod-k": () => promptForLink(this.editor),
    };
  },
});
