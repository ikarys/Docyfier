import { Node, mergeAttributes } from "@tiptap/core";
import type { CardAccent } from "./Cards";
import { deleteLayoutBlockOnBackspace } from "./layoutDelete";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    timeline: {
      insertTimeline: (count?: number) => ReturnType;
    };
  }
}

/**
 * Timeline / roadmap: a vertical sequence of milestones on a themed rail.
 * Each item reads positionally — a short date/phase, a title, then free
 * description blocks — so everything stays editable inline (see globals.css).
 */
export const Timeline = Node.create({
  name: "timeline",
  group: "block",
  content: "timelineItem{2,8}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

  parseHTML() {
    return [{ tag: "div[data-timeline]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-timeline": "", class: "timeline" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertTimeline:
        (count = 3) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: count }, (_, i) => ({
              type: "timelineItem",
              attrs: { accent: (["blue", "green", "purple", "yellow"] as const)[i % 4] },
              content: [
                { type: "paragraph", content: [{ type: "text", text: `Phase ${i + 1}` }] },
                {
                  type: "heading",
                  attrs: { level: 3 },
                  content: [{ type: "text", text: `Milestone ${i + 1}` }],
                },
                { type: "paragraph", content: [{ type: "text", text: "What happens here." }] },
              ],
            })),
          }),
    };
  },
});

export const TimelineItem = Node.create({
  name: "timelineItem",
  // Positional: paragraph (date/phase) → heading (title) → description.
  // Whitelist excludes layout blocks so they can never nest here (as Card does).
  content:
    "paragraph heading (paragraph | bulletList | orderedList | blockquote | codeBlock | table | callout)*",
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
    return [{ tag: "div[data-timeline-item]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-timeline-item": "",
        class: "timeline-item",
      }),
      0,
    ];
  },
});
