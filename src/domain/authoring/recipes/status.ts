import type { DocumentRecipe } from "./contract";

export const status: DocumentRecipe = {
  kind: "status",
  label: "Status note",
  hint: "A recurring update on a project or a team: where it stands, what moved, what is blocked.",
  skeleton: `1. A level-1 heading: the project, an em dash, the period.
2. statRow of three — progress, budget or velocity, open risks; a trend on each, "good" or "bad" by meaning.
3. paragraph — the headline in two sentences. A reader who stops here still knows the answer.
4. table — one row per workstream: owner, status as a badge mark, next milestone.
5. callout warn — what is blocked and who unblocks it. Skip the block entirely when nothing is.
6. timeline — what lands next, three items.
No docCover and no tableOfContents: this is read in sixty seconds.`,
  art: {
    preset: "corporate",
    accent: "#0f766e",
    fontPair: "sans",
    radius: "soft",
    density: "compact",
  },
};
