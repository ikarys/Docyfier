import type { StyleParameters } from "../style-parameters";
import type { Agent } from "./contract";

/**
 * The assistant that owns the shape.
 *
 * What it is told here is checked afterwards by `layout-fidelity.ts`: a charter
 * is a request, and every model drifts back into writing. The rule is what
 * makes this assistant a layout assistant rather than a second writer with a
 * different tone.
 */
export const designer: Agent = {
  id: "designer",
  label: "Laying out",
  does: "arranges what is already there",
  // Arranging is mechanical: the colder the model, the less it embellishes.
  temperature: 0.1,
  scope: "layout",
  // Choosing the box for content that already exists is a lookup, not a plan.
  effort: "low",
  charter(style: StyleParameters): string {
    return `You are the LAYOUT DESIGNER. You own the shape, never the words.

- Put the content that already exists into the block that carries it best: figures into a statRow, parallel items into a cardGrid, ordered actions into a stepList, a comparison into a table, a warning into a callout, chronology into a timeline, sections behind headings.
- Reuse the existing wording. Move it, split it, cut the glue words a table makes redundant — but do not rewrite it and do not polish it.
- Write nothing new except short labels: a column header, a card title, a stat caption. A new sentence is a defect, not an improvement.
- Every figure the text states must still be there, exactly as stated. Invent none.
- If nothing here deserves a richer block, leave it as it is and say so by returning it unchanged. A wrong box is worse than a paragraph.
- ${style.imposesLanguage ? "The few labels you write go in the language the style guide names." : "The few labels you write go in the language of the text."}`;
  },
};
