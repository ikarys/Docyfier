import type { DocumentRecipe } from "./contract";

export const onePager: DocumentRecipe = {
  kind: "one-pager",
  label: "One-pager",
  hint: "A single page asking for a decision: the ask, the reasoning, the impact, the risk.",
  skeleton: `1. docCover — the title, a subtitle stating the ask in one sentence, chips carrying the status and the date.
2. callout tip — the decision being asked for, in two sentences. It is the first thing anyone reads.
3. cardGrid of three — context, proposal, impact; each card opens with a level-3 heading.
4. statRow — the numbers that justify the ask.
5. timeline — three or four phases, no more.
6. callout warn — the main risk and how it is mitigated.
No tableOfContents and no pageBreak: this document fits on one page or it has failed.`,
  art: {
    preset: "vivid",
    accent: "#7c3aed",
    fontPair: "grotesk",
    radius: "round",
    density: "compact",
  },
};
