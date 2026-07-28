import type { DocumentRecipe } from "./contract";

export const roadmap: DocumentRecipe = {
  kind: "roadmap",
  label: "Roadmap",
  hint: "What is coming, in which order, and what it is measured on.",
  skeleton: `1. docCover — the title, a subtitle with the horizon it covers, chips for the themes.
2. paragraph — the one bet this plan makes, in two sentences.
3. timeline — one item per quarter or phase: the period, the milestone as a level-3 heading, one line of description. Vary the accent by theme.
4. cardGrid — the workstreams, one card each, its state as a badge mark.
5. statRow — the targets the plan is measured on.
6. callout note — what is explicitly not planned, so the question stops being asked.`,
  art: {
    preset: "vivid",
    accent: "#7c3aed",
    fontPair: "expressive",
    radius: "round",
    density: "normal",
  },
};
