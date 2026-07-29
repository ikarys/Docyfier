import type { Editor, Range } from "@tiptap/core";

/**
 * One row of the slash menu. A new block is one entry in one of the families
 * beside this file — never a branch in the menu itself.
 */
export interface SlashItem {
  title: string;
  icon: string;
  /** English + French keywords for fuzzy matching, lowercase. */
  keywords: string[];
  command: (opts: { editor: Editor; range: Range }) => void;
}
