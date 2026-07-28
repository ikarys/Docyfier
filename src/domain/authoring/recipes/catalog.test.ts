import { describe, expect, it } from "vitest";
import { DEFAULT_RECIPE, RECIPES, findRecipe } from "./catalog";

describe("the recipe catalog", () => {
  it("gives every kind one entry", () => {
    const kinds = RECIPES.map((r) => r.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("describes every recipe well enough for a model to choose it", () => {
    for (const recipe of RECIPES) {
      expect(recipe.label.trim()).not.toBe("");
      expect(recipe.hint.trim()).not.toBe("");
      expect(recipe.skeleton.trim()).not.toBe("");
      expect(recipe.art.preset.trim()).not.toBe("");
    }
  });

  it("finds a recipe by kind and nothing by an unknown one", () => {
    expect(findRecipe("postmortem")?.kind).toBe("postmortem");
    expect(findRecipe("haiku")).toBeUndefined();
    expect(findRecipe(42)).toBeUndefined();
  });

  it("falls back on a recipe that is itself in the catalog", () => {
    expect(RECIPES).toContain(DEFAULT_RECIPE);
  });

  it("names a block the format contract knows in every skeleton", () => {
    // A skeleton naming a node type the editor cannot render would be asked
    // for on every document of that kind and rejected on every one of them.
    const nodes = [
      "docCover",
      "tableOfContents",
      "heading",
      "paragraph",
      "bulletList",
      "orderedList",
      "blockquote",
      "codeBlock",
      "horizontalRule",
      "callout",
      "table",
      "cardGrid",
      "columnList",
      "statRow",
      "timeline",
      "stepList",
      "chart",
      "pyramid",
      "pageBreak",
    ];
    for (const recipe of RECIPES) {
      const named = recipe.skeleton.match(/\b[a-z]+[A-Z][a-zA-Z]*\b|\b(heading|paragraph|table|callout|chart|timeline)\b/g);
      expect(named, `${recipe.kind} names no block`).not.toBeNull();
      for (const word of named ?? []) {
        expect(nodes, `${recipe.kind} names "${word}"`).toContain(word);
      }
    }
  });
});
