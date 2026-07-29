import { Node, mergeAttributes } from "@tiptap/core";
import { IMAGE_ROW_MAX, IMAGE_ROW_MIN } from "@/domain/documents/image";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageRow: {
      insertImageRow: (images: { src: string; alt?: string }[]) => ReturnType;
    };
  }
}

/**
 * A gallery: two to four images side by side (PLAN.md STEP U10), the same
 * isolating-container shape as `cardGrid`.
 *
 * The count is the content expression's business alone — a row is as many
 * columns as it holds, so there is no second place for that number to drift.
 *
 * Schema only, and no node view: the images inside draw themselves.
 */
export const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  content: `image{${IMAGE_ROW_MIN},${IMAGE_ROW_MAX}}`,
  isolating: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "div[data-image-row]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-image-row": "", class: "image-row" }),
      0,
    ];
  },

  addCommands() {
    return {
      insertImageRow:
        (images) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: images.map(({ src, alt }) => ({
              type: "image",
              attrs: { src, alt: alt ?? "" },
            })),
          }),
    };
  },
});
