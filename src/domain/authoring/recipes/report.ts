import type { DocumentRecipe } from "./contract";

export const report: DocumentRecipe = {
  kind: "report",
  label: "Report",
  hint: "An analysis or a review written for someone who was not there: findings, figures, a recommendation.",
  skeleton: `1. docCover — the title, a subtitle naming the audience, a meta line (author · month · reading time).
2. paragraph — three sentences: what this covers, for whom, what to do with it.
3. statRow — the three or four headline figures, each with a delta and a trend when the figure moved.
4. tableOfContents — only when the document has four or more level-2 sections.
5. One level-2 heading per section. Inside a section: a short paragraph, then the block the content actually is — a chart for a series of numbers you were given, a cardGrid for parallel items, a table only for a dense grid.
6. callout note — "What to remember", three lines at most.
7. stepList — the next steps, one step per owner.`,
  art: {
    preset: "corporate",
    accent: "#2563eb",
    fontPair: "sans",
    radius: "soft",
    density: "normal",
  },
};
