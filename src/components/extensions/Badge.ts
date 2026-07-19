import { Mark, mergeAttributes } from "@tiptap/core";

export type BadgeVariant =
  | "gray"
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    badge: {
      toggleBadge: (variant?: BadgeVariant) => ReturnType;
      setBadgeVariant: (variant: BadgeVariant) => ReturnType;
      unsetBadge: () => ReturnType;
    };
  }
}

/**
 * Inline pill/tag: text rendered as a small colored badge. Used for statuses,
 * priorities, labels ("Done", "P1", "Beta"…). Styled in globals.css.
 */
export const Badge = Mark.create({
  name: "badge",

  addAttributes() {
    return {
      variant: {
        default: "blue" as BadgeVariant,
        parseHTML: (el) => el.getAttribute("data-variant") ?? "blue",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-badge]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, { "data-badge": "", class: "badge" }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleBadge:
        (variant = "blue") =>
        ({ commands }) =>
          commands.toggleMark(this.name, { variant }),
      setBadgeVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
      unsetBadge:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
