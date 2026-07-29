import { Image } from "@tiptap/extension-image";
import { DEFAULT_IMAGE_ALIGNMENT, imageAlignment } from "@/domain/documents/image";

/**
 * Block image (PLAN.md STEP U2). Adds a `width` attribute expressed as a
 * percentage of the text column — a percentage rather than pixels so the same
 * document lays out identically on screen and on an A4 page — and the place it
 * takes on that page.
 *
 * Schema-only, no React import: `src/infrastructure/editor/schema.ts` is server-only and
 * imports this file to validate AI output. The node view lives in
 * `src/components/ImageView.tsx`; the vocabulary both read is in
 * `src/domain/documents/image.ts`.
 */
// Base64 payloads would inline megabytes into every document JSON — images
// always go through the upload route and are referenced by URL.
export const DocImage = Image.configure({ inline: false, allowBase64: false }).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      // The percentage is the figure's, not the image's — see `ImageView` —
      // so nothing here writes a style the node view would contradict.
      width: {
        default: 100,
        parseHTML: (el) => Number(el.getAttribute("data-width") ?? 100),
        renderHTML: (attrs) => ({ "data-width": attrs.width }),
      },
      align: {
        default: DEFAULT_IMAGE_ALIGNMENT,
        parseHTML: (el) => imageAlignment(el.getAttribute("data-align")),
        renderHTML: (attrs) => ({ "data-align": attrs.align }),
      },
      // Shaped like the chart's caption, so both read the same way to the
      // renderers and to the model writing them.
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-caption"),
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },
});
