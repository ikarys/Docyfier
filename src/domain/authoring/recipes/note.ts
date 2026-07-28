import type { DocumentRecipe } from "./contract";

export const note: DocumentRecipe = {
  kind: "note",
  label: "Short note",
  hint: "A few paragraphs on one subject: meeting notes, a decision written down, an idea captured.",
  skeleton: `1. A level-1 heading: the subject in five words.
2. paragraph — the point, in the first sentence.
3. A list — the details, one line each.
4. callout note — only when there is a takeaway worth pulling out.
Nothing else. No docCover, no tableOfContents, no statRow: a note that grew a cover is no longer a note.`,
  art: {
    preset: "minimal",
    accent: "#111827",
    fontPair: "grotesk",
    radius: "sharp",
    density: "normal",
  },
};
