import type { DocumentRecipe } from "./contract";

export const guide: DocumentRecipe = {
  kind: "guide",
  label: "How-to guide",
  hint: "A procedure someone follows to get something done, start to finish.",
  skeleton: `1. A level-1 heading: "How to" plus the task.
2. paragraph — who this is for and what they will have at the end.
3. callout note — the prerequisites, one line each.
4. stepList — the procedure, one step per action, written in the imperative. Never number the steps yourself.
5. codeBlock — the commands, in the order the steps call for them.
6. table — the options or flags, one row each, with what they change.
7. callout tip — the shortcut an experienced reader is looking for.
8. callout danger — the mistake that costs the most, and how to undo it.`,
  art: {
    preset: "editorial",
    accent: "#0f766e",
    fontPair: "sans",
    radius: "soft",
    density: "normal",
  },
};
