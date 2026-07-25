import { Node, mergeAttributes } from "@tiptap/core";
import type { CardAccent } from "./Cards";
import { deleteLayoutBlockOnBackspace } from "./layoutDelete";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    stepList: {
      insertSteps: (count?: number) => ReturnType;
    };
  }
}

/**
 * Process / how-it-works: numbered steps flowing left-to-right. The number is
 * drawn by CSS (a counter), so items only carry a title and description and
 * stay editable inline (see globals.css).
 */
export const StepList = Node.create({
  name: "stepList",
  group: "block",
  content: "step{2,6}",
  isolating: true,

  addKeyboardShortcuts() {
    return { Backspace: deleteLayoutBlockOnBackspace(this.name) };
  },

  parseHTML() {
    return [{ tag: "div[data-steps]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-steps": "", class: "steps" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertSteps:
        (count = 3) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: count }, (_, i) => ({
              type: "step",
              attrs: { accent: (["blue", "green", "purple", "yellow"] as const)[i % 4] },
              content: [
                {
                  type: "heading",
                  attrs: { level: 3 },
                  content: [{ type: "text", text: `Step ${i + 1}` }],
                },
                { type: "paragraph", content: [{ type: "text", text: "What to do." }] },
              ],
            })),
          }),
    };
  },
});

export const Step = Node.create({
  name: "step",
  // Title (heading) then description. Whitelist excludes layout blocks so they
  // can never nest inside a step (same rationale as Card).
  content:
    "heading (paragraph | bulletList | orderedList | blockquote | codeBlock | table | callout)*",
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
    return [{ tag: "div[data-step]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-step": "", class: "step" }),
      0,
    ];
  },
});
