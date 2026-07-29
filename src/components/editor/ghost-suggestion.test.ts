import { describe, expect, it } from "vitest";
import { continuationJoin, ghostStands } from "./ghost-suggestion";

describe("ghostStands", () => {
  it("stands while the caret has not moved from where it was offered", () => {
    expect(ghostStands({ at: 42, text: "la suite" }, 42)).toBe(true);
  });

  it("falls as soon as the writer answers the question themselves", () => {
    expect(ghostStands({ at: 42, text: "la suite" }, 43)).toBe(false);
    expect(ghostStands({ at: 42, text: "la suite" }, 12)).toBe(false);
  });
});

describe("continuationJoin", () => {
  it("puts back the space the model was told not to write", () => {
    expect(continuationJoin("Le trimestre", "s'achève")).toBe(" s'achève");
  });

  it("adds none where there is one already", () => {
    expect(continuationJoin("Le trimestre ", "s'achève")).toBe("s'achève");
    expect(continuationJoin("", "Bonjour")).toBe("Bonjour");
  });

  it("adds none before punctuation, which would read as a typo", () => {
    expect(continuationJoin("Le trimestre", ", enfin, s'achève")).toBe(", enfin, s'achève");
    expect(continuationJoin("Le trimestre", "…")).toBe("…");
  });

  it("has nothing to insert when the suggestion is only whitespace", () => {
    expect(continuationJoin("Le trimestre", "   ")).toBe("");
  });
});
