import type { ArtDirection } from "../art-direction";

/**
 * What one kind of document is made of.
 *
 * The style guide says what a good document looks like in general; a recipe
 * says what *this* kind is: which blocks, in which order, and dressed how. It
 * is the difference between handing the model a catalogue of twenty blocks and
 * handing it a shape to fill — the reason two documents of different kinds stop
 * coming out as the same document with different words.
 *
 * Adding a kind is one file plus one line in the catalog: no switch to edit,
 * no prompt to rewrite.
 */
export interface DocumentRecipe {
  /** Stable id; the planning pass answers with it. */
  kind: string;
  label: string;
  /** What this kind is for — the line the planning pass chooses on. */
  hint: string;
  /** The block sequence the writer fills, in the order it must appear. */
  skeleton: string;
  /** Dress that fits the kind, unless the plan proposes another. */
  art: ArtDirection;
}
