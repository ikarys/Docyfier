import type { DocumentRecipe } from "./contract";

export const postmortem: DocumentRecipe = {
  kind: "postmortem",
  label: "Incident postmortem",
  hint: "What broke, what it cost, why it happened and what changes because of it.",
  skeleton: `1. docCover — the incident name, a subtitle with the severity and the duration, a meta line with the date.
2. statRow — time to detect, time to mitigate, users affected; trend "bad" on what hurt.
3. callout danger — the impact in plain words, for a reader who was not on call.
4. Level-2 "Timeline", then a timeline — one item per event, the clock time as the date line.
5. Level-2 "Root cause", then a paragraph, plus a codeBlock of the failing query or line when there is one.
6. Level-2 "What went well" and "What went wrong" as a columnList of two lists.
7. stepList — the action items, each carrying its owner as a badge mark.
Blameless about people, exact about facts. Never soften a number.`,
  art: {
    preset: "editorial",
    accent: "#be123c",
    fontPair: "humanist",
    radius: "soft",
    density: "normal",
  },
};
