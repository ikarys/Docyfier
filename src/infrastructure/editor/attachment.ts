import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    attachment: {
      insertAttachment: (file: { href: string; name: string; size: number }) => ReturnType;
    };
  }
}

/**
 * A file carried by the document (PLAN.md STEP U10): a PDF, a deck, a sheet.
 *
 * An atom, like `chart` and `embed` — everything it is lives in attrs. What
 * may be stored at all is decided by `src/lib/uploads.ts`, which refuses SVG
 * and anything else a browser would execute.
 *
 * Schema only, no React: the node view is `src/components/AttachmentView.tsx`.
 */
export const Attachment = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      href: {
        default: "",
        parseHTML: (el) => el.getAttribute("href") ?? "",
        renderHTML: (attrs) => ({ href: attrs.href }),
      },
      name: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-name") ?? "",
        renderHTML: (attrs) => ({ "data-name": attrs.name }),
      },
      size: {
        default: -1,
        parseHTML: (el) => Number(el.getAttribute("data-size") ?? -1),
        renderHTML: (attrs) => ({ "data-size": String(attrs.size) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-attachment]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { "data-attachment": "", class: "attachment" }),
      String(node.attrs.name || node.attrs.href),
    ];
  },

  addCommands() {
    return {
      insertAttachment:
        (file) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: file }),
    };
  },
});
