import { describe, expect, it } from "vitest";
import { readArtDirection } from "@/domain/authoring/art-direction";
import { RECIPES } from "@/domain/authoring/recipes/catalog";
import { artVocabulary } from "./art-vocabulary";

describe("the art vocabulary", () => {
  it("keeps every recipe's own dress usable", () => {
    // A recipe naming a preset or a font pair this app does not have would be
    // dropped on every document of that kind, silently.
    for (const recipe of RECIPES) {
      expect(
        readArtDirection(recipe.art, artVocabulary()),
        `${recipe.kind} names a preset or an override that no longer exists`,
      ).toEqual(recipe.art);
    }
  });

  it("offers the model a hint for every choice it can make", () => {
    const { presets, fontPairs } = artVocabulary();
    expect(presets.length).toBeGreaterThan(1);
    expect(fontPairs.length).toBeGreaterThan(1);
    for (const choice of [...presets, ...fontPairs]) {
      expect(choice.hint.trim()).not.toBe("");
    }
  });
});
