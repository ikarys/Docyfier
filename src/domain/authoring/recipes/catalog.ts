import type { DocumentRecipe } from "./contract";
import { guide } from "./guide";
import { note } from "./note";
import { onePager } from "./one-pager";
import { postmortem } from "./postmortem";
import { report } from "./report";
import { roadmap } from "./roadmap";
import { spec } from "./spec";
import { status } from "./status";

/**
 * Every kind of document the writer knows how to shape.
 *
 * A new kind is a file plus a line here — the planning prompt, the writer
 * prompt and the fallback all read this list, so none of them needs editing.
 */
export const RECIPES: readonly DocumentRecipe[] = [
  report,
  onePager,
  spec,
  status,
  postmortem,
  roadmap,
  guide,
  note,
];

/** What an unrecognized kind falls back to: the least presumptuous shape. */
export const DEFAULT_RECIPE = note;

export function findRecipe(kind: unknown): DocumentRecipe | undefined {
  return RECIPES.find((recipe) => recipe.kind === kind);
}

/** The catalog as the planning prompt reads it: one kind per line. */
export function recipeChoices(): string {
  return RECIPES.map((recipe) => `- "${recipe.kind}": ${recipe.hint}`).join("\n");
}
