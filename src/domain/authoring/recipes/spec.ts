import type { DocumentRecipe } from "./contract";

export const spec: DocumentRecipe = {
  kind: "spec",
  label: "Technical spec",
  hint: "A design document for engineers: problem, goals, the design itself, the interfaces, the rollout.",
  skeleton: `1. A level-1 heading, not a docCover — a spec is read in a tool, not presented.
2. paragraph — the problem in three sentences, no solution yet.
3. tableOfContents.
4. Level-2 "Goals" and "Non-goals" as a columnList of two lists.
5. One level-2 heading per design section: a paragraph, plus a codeBlock wherever an interface or a payload says it better than prose.
6. table — the API surface or the schema, one row per field, with the type and whether it is required.
7. callout warn — the open questions, one line each.
8. stepList — the rollout, one step per stage.`,
  art: {
    preset: "minimal",
    accent: "#111827",
    fontPair: "grotesk",
    radius: "sharp",
    density: "normal",
  },
};
