import { describe, expect, it } from "vitest";
import { themeFromArt } from "./theme-from-art";

describe("themeFromArt", () => {
  it("turns a direction into the document's theme", () => {
    expect(
      themeFromArt({
        preset: "corporate",
        accent: "#be123c",
        fontPair: "serif",
        radius: "round",
        density: "airy",
      }),
    ).toEqual({
      preset: "corporate",
      overrides: {
        accent: "#be123c",
        fontPair: "serif",
        radius: "round",
        density: "airy",
      },
    });
  });

  it("dresses a document in a preset alone, with nothing overridden", () => {
    expect(themeFromArt({ preset: "minimal" })).toEqual({ preset: "minimal" });
  });

  it("leaves the document its own theme when no direction was given", () => {
    expect(themeFromArt(null)).toBeNull();
  });

  it("falls back to the default preset rather than an invented one", () => {
    expect(themeFromArt({ preset: "neon" })?.preset).toBe("editorial");
  });
});
