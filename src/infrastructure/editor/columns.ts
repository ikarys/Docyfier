import { Node, mergeAttributes } from "@tiptap/core";
import { deleteLayoutBlockOnBackspace } from "./layout-delete";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    columnList: {
      insertColumns: (count?: number) => ReturnType;
    };
  }
}

/** Multi-column layout: 2-4 side-by-side columns of arbitrary blocks. */
export const ColumnList = Node.create({
  name: "columnList",
  group: "block",
  content: "column{2,4}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

  parseHTML() {
    return [{ tag: "div[data-columns]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-columns": "", class: "columns" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertColumns:
        (count = 2) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: count }, () => ({
              type: "column",
              content: [{ type: "paragraph" }],
            })),
          }),
    };
  },
});

export const Column = Node.create({
  name: "column",
  // No layout blocks nested inside a column (same rationale as Card).
  content:
    "(heading | paragraph | bulletList | orderedList | blockquote | codeBlock | table | callout)+",
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-column]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-column": "", class: "column" }),
      0,
    ];
  },
});
