import { Node, mergeAttributes } from "@tiptap/core";

export const COVER_LINE_VARIANTS = ["subtitle", "chips", "meta"] as const;
export type CoverLineVariant = (typeof COVER_LINE_VARIANTS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    docCover: {
      /** Insert a cover as the document's first block. No-op if one exists. */
      insertCover: () => ReturnType;
    };
  }
}

/**
 * Document cover (PLAN.md STEP U2, enriched in STEP U6): the full-bleed themed
 * opening block of a document — title, optional subtitle, an optional row of
 * chips, and an optional meta line (author · date · reading time).
 *
 * "First node only" is enforced by the insert command rather than by the
 * schema: a content expression pinning it to position 0 would make every AI
 * document that merely puts a heading first fail validation, and would leave
 * the user unable to drag it away and back.
 */
export const DocCover = Node.create({
  name: "docCover",
  group: "block",
  // A heading carries the title so the existing `deriveTitle` keeps working
  // unchanged; the rest is a free list of decorated lines.
  content: "heading coverLine*",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "header[data-cover]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "header",
      mergeAttributes(HTMLAttributes, { "data-cover": "", class: "doc-cover" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCover:
        () =>
        ({ state, chain }) => {
          const hasCover = state.doc.content.child(0)?.type.name === this.name;
          if (hasCover) return false;
          return chain()
            .insertContentAt(0, {
              type: this.name,
              content: [
                {
                  type: "heading",
                  attrs: { level: 1 },
                  content: [{ type: "text", text: "Document title" }],
                },
                {
                  type: "coverLine",
                  attrs: { variant: "subtitle" },
                  content: [{ type: "text", text: "A short subtitle" }],
                },
                {
                  type: "coverLine",
                  attrs: { variant: "meta" },
                  content: [{ type: "text", text: "Author · Date · 5 min read" }],
                },
              ],
            })
            .focus()
            .run();
        },
    };
  },
});

/** One decorated line of a cover. `chips` renders its badge marks as pills. */
export const CoverLine = Node.create({
  name: "coverLine",
  content: "inline*",

  addAttributes() {
    return {
      variant: {
        default: "subtitle" as CoverLineVariant,
        parseHTML: (el) => el.getAttribute("data-variant") ?? "subtitle",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "p[data-cover-line]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-cover-line": "",
        class: "cover-line",
      }),
      0,
    ];
  },
});
