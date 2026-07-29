import { Node, mergeAttributes } from "@tiptap/core";
import { embedFor } from "@/domain/documents/embed";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      /** Insert the embed a page URL stands for; nothing at all if none does. */
      insertEmbed: (url: string) => ReturnType;
    };
  }
}

/**
 * An embedded page (PLAN.md STEP U10): a video, a recording, a design.
 *
 * An atom, like `chart` and `diagram` — everything it is lives in attrs. What
 * may be framed is not decided here but in `src/domain/documents/embed.ts`,
 * and enforced server-side by `src/infrastructure/editor/schema.ts`.
 *
 * Schema only, no React: the node view is `src/components/EmbedView.tsx`.
 */
export const Embed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-src") ?? "",
        renderHTML: (attrs) => ({ "data-src": attrs.src }),
      },
      href: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-href") ?? "",
        renderHTML: (attrs) => ({ "data-href": attrs.href }),
      },
      provider: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-provider") ?? "",
        renderHTML: (attrs) => ({ "data-provider": attrs.provider }),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) => (attrs.title ? { "data-title": attrs.title } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-embed": "", class: "embed" })];
  },

  addCommands() {
    return {
      insertEmbed:
        (url) =>
        ({ commands }) => {
          const target = embedFor(url);
          return target ? commands.insertContent({ type: this.name, attrs: target }) : false;
        },
    };
  },
});
