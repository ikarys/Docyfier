import { Node, mergeAttributes } from "@tiptap/core";
import type { CardAccent } from "./Cards";
import { deleteLayoutBlockOnBackspace } from "./layoutDelete";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    statRow: {
      insertStatRow: (count?: number) => ReturnType;
    };
  }
}

/**
 * Key-figures strip: a row of big numbers with labels ("42% adoption",
 * "3x faster"…). Each stat = value (big) + label (small), plus an optional
 * third paragraph rendered as a delta pill ("−73%") colored by `trend`.
 */
export const StatRow = Node.create({
  name: "statRow",
  group: "block",
  content: "stat{2,4}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

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

export type StatTrend = "good" | "bad" | "flat";

export const Stat = Node.create({
  name: "stat",
  // value, label, then an optional delta paragraph (rendered as a pill).
  content: "paragraph paragraph paragraph?",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      accent: {
        default: "blue" as CardAccent,
        parseHTML: (el) => el.getAttribute("data-accent") ?? "blue",
        renderHTML: (attrs) => ({ "data-accent": attrs.accent }),
      },
      // Colors the optional delta pill: good = green, bad = red, flat = gray.
      trend: {
        default: "flat" as StatTrend,
        parseHTML: (el) => el.getAttribute("data-trend") ?? "flat",
        renderHTML: (attrs) => ({ "data-trend": attrs.trend }),
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
