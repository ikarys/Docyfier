import { Image } from "@tiptap/extension-image";

export const IMAGE_WIDTHS = [25, 50, 75, 100] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

/**
 * Block image (PLAN.md STEP U2). Adds a `width` attribute expressed as a
 * percentage of the text column — a percentage rather than pixels so the same
 * document lays out identically on screen and on an A4 page.
 *
 * Schema-only, no React import: `src/lib/ai/doc-schema.ts` is server-only and
 * imports this file to validate AI output. The node view lives in
 * `src/components/ImageView.tsx`.
 */
// Base64 payloads would inline megabytes into every document JSON — images
// always go through the upload route and are referenced by URL.
export const DocImage = Image.configure({ inline: false, allowBase64: false }).extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: 100,
        parseHTML: (el) => Number(el.getAttribute("data-width") ?? 100),
        renderHTML: (attrs) => ({
          "data-width": attrs.width,
          style: `width:${attrs.width}%`,
        }),
      },
    };
  },
});
