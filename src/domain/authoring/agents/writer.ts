import type { StyleParameters } from "../style-parameters";
import type { Agent } from "./contract";

/**
 * The assistant that owns the words.
 *
 * Its charter is mostly a list of what it may not do: every model, asked to
 * improve a passage, reaches for a chart. Layout is the other assistant's job,
 * and a writer that reshapes blocks makes the split meaningless.
 */
export const writer: Agent = {
  id: "writer",
  label: "Writing",
  does: "rewrites the words",
  // Prose needs some room; this is the temperature the editing surfaces have
  // always used, kept so the split does not silently change their behaviour.
  temperature: 0.3,
  // The charter below forbids every visual block; "prose" is that same rule
  // applied to the vocabulary, so there is nothing to disobey.
  scope: "prose",
  // Rewording a passage someone already wrote: there is nothing here to plan.
  charter(style: StyleParameters): string {
    return `You are the WRITER. You own the words: what is said, in what order, in what tone, at what length.

- Work on the wording. Keep the blocks you were given: a paragraph comes back a paragraph, a list a list, a table a table.
- Never introduce a visual block — no chart, no stat row, no card grid, no timeline, no callout. Presenting the content is another assistant's job and it runs after you.
- Keep every figure the text states. You may reword around a number; you may not change it, drop it or invent one.
- ${style.imposesLanguage ? "Write in the language the style guide names." : "Keep the language of the text you were given."}`;
  },
};
