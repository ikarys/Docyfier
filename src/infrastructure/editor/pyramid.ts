import { Node, mergeAttributes } from "@tiptap/core";
import { deleteLayoutBlockOnBackspace } from "./layout-delete";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pyramid: {
      insertPyramid: (count?: number) => ReturnType;
    };
  }
}

/**
 * Pyramid / hierarchy: stacked tiers from a narrow apex to a wide base
 * (priorities, Maslow, vision→execution). Tier width and accent tint come
 * from CSS position (see globals.css); tiers only carry text and stay
 * editable inline.
 */
export const Pyramid = Node.create({
  name: "pyramid",
  group: "block",
  content: "pyramidTier{2,5}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

  parseHTML() {
    return [{ tag: "div[data-pyramid]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-pyramid": "", class: "pyramid" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertPyramid:
        (count = 3) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: count }, (_, i) => ({
              type: "pyramidTier",
              content: [{ type: "paragraph", content: [{ type: "text", text: `Tier ${i + 1}` }] }],
            })),
          }),
    };
  },
});

export const PyramidTier = Node.create({
  name: "pyramidTier",
  content: "paragraph+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-pyramid-tier]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-pyramid-tier": "",
        class: "pyramid-tier",
      }),
      0,
    ];
  },
});
