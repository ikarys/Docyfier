import { Node, mergeAttributes } from "@tiptap/core";
import { deleteLayoutBlockOnBackspace } from "./layoutDelete";

export type CardAccent =
  | "none"
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cardGrid: {
      insertCardGrid: (cards?: number) => ReturnType;
    };
  }
}

/**
 * Card grid: a responsive row of cards. Each card is a free block container
 * (typically a small heading + text) with an optional colored accent.
 */
export const CardGrid = Node.create({
  name: "cardGrid",
  group: "block",
  content: "card{2,4}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

  addAttributes() {
    return {
      cols: {
        default: 3,
        parseHTML: (el) => Number(el.getAttribute("data-cols") ?? 3),
        renderHTML: (attrs) => ({ "data-cols": attrs.cols }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-card-grid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-card-grid": "",
        class: "card-grid",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCardGrid:
        (cards = 3) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { cols: cards },
            content: Array.from({ length: cards }, (_, i) => ({
              type: "card",
              attrs: { accent: (["blue", "green", "purple", "yellow"] as const)[i % 4] },
              content: [
                {
                  type: "heading",
                  attrs: { level: 3 },
                  content: [{ type: "text", text: `Card ${i + 1}` }],
                },
                { type: "paragraph" },
              ],
            })),
          }),
    };
  },
});

export const Card = Node.create({
  name: "card",
  // Whitelist: no layout blocks (cardGrid/statRow/columnList) nested inside a
  // card — they collapse into unreadable slivers at card width.
  content:
    "(heading | paragraph | bulletList | orderedList | blockquote | codeBlock | table | callout)+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      accent: {
        default: "none" as CardAccent,
        parseHTML: (el) => el.getAttribute("data-accent") ?? "none",
        renderHTML: (attrs) => ({ "data-accent": attrs.accent }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-card]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-card": "", class: "card" }),
      0,
    ];
  },
});
