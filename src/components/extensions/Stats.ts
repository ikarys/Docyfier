import { Node, mergeAttributes } from "@tiptap/core";
import type { CardAccent } from "./Cards";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    statRow: {
      insertStatRow: (count?: number) => ReturnType;
    };
  }
}

/**
 * Key-figures strip: a row of big numbers with labels ("42% adoption",
 * "3x faster"…). Each stat = two paragraphs: value (big) then label (small).
 */
export const StatRow = Node.create({
  name: "statRow",
  group: "block",
  content: "stat{2,4}",
  isolating: true,

  parseHTML() {
    return [{ tag: "div[data-stat-row]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-stat-row": "",
        class: "stat-row",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertStatRow:
        (count = 3) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: count }, (_, i) => ({
              type: "stat",
              attrs: { accent: (["blue", "green", "purple", "yellow"] as const)[i % 4] },
              content: [
                { type: "paragraph", content: [{ type: "text", text: "42%" }] },
                {
                  type: "paragraph",
                  content: [{ type: "text", text: `Metric ${i + 1}` }],
                },
              ],
            })),
          }),
    };
  },
});

export const Stat = Node.create({
  name: "stat",
  content: "paragraph paragraph",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      accent: {
        default: "blue" as CardAccent,
        parseHTML: (el) => el.getAttribute("data-accent") ?? "blue",
        renderHTML: (attrs) => ({ "data-accent": attrs.accent }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-stat]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-stat": "", class: "stat" }),
      0,
    ];
  },
});
