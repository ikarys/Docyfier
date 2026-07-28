// Import from @tiptap/core (not /react) so the extension is also usable
// server-side for headless schema validation of AI output.
import { Node, mergeAttributes } from "@tiptap/core";
import { iconAttribute, renderWithIcon } from "./icon";

export type CalloutVariant = "note" | "tip" | "warn" | "danger";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant?: CalloutVariant) => ReturnType;
      toggleCallout: (variant?: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/**
 * A block container rendered as a colored callout. Wraps block content and
 * carries a `variant` attribute that drives the color (see globals.css).
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "note" as CalloutVariant,
        parseHTML: (el) => el.getAttribute("data-variant") ?? "note",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
      ...iconAttribute,
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return renderWithIcon(
      "div",
      node.attrs,
      mergeAttributes(HTMLAttributes, { "data-callout": "", class: "callout" }),
      "callout-body",
    );
  },

  addCommands() {
    return {
      setCallout:
        (variant = "note") =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      toggleCallout:
        (variant = "note") =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
      setCalloutVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
    };
  },
});
