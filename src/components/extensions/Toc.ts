import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
    };
  }
}

/**
 * Table of contents (PLAN.md STEP U2). Stored as a single empty atom: the
 * entries are *derived* from the document's headings by the node view, so they
 * can never drift out of sync with the headings the way a copied list would.
 *
 * Schema-only, no React import: `src/lib/ai/doc-schema.ts` is server-only and
 * imports this file. The node view lives in `src/components/TocView.tsx`.
 */
export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  isolating: true,
  selectable: true,

  parseHTML() {
    return [{ tag: "nav[data-toc]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "nav",
      mergeAttributes(HTMLAttributes, { "data-toc": "", class: "doc-toc" }),
    ];
  },

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
