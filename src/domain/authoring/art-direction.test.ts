import { describe, expect, it } from "vitest";
import { readArtDirection, type ArtVocabulary } from "./art-direction";

const vocabulary: ArtVocabulary = {
  presets: [
    { id: "editorial", hint: "neutral" },
    { id: "corporate", hint: "business" },
  ],
  fontPairs: [
    { id: "sans", hint: "modern sans" },
    { id: "serif", hint: "classic serif" },
  ],
  radii: ["sharp", "soft", "round"],
  densities: ["compact", "normal", "airy"],
};

describe("readArtDirection", () => {
  it("reads a direction the vocabulary knows", () => {
    expect(
      readArtDirection(
        {
          preset: "corporate",
          accent: "#2563eb",
          fontPair: "serif",
          radius: "round",
          density: "airy",
        },
        vocabulary,
      ),
    ).toEqual({
      preset: "corporate",
      accent: "#2563eb",
      fontPair: "serif",
      radius: "round",
      density: "airy",
    });
  });

  it("hands back nothing when the preset is not one of ours", () => {
    expect(readArtDirection({ preset: "neon" }, vocabulary)).toBeNull();
    expect(readArtDirection({ accent: "#2563eb" }, vocabulary)).toBeNull();
  });

  it("hands back nothing when the answer is not an object", () => {
    expect(readArtDirection("corporate", vocabulary)).toBeNull();
    expect(readArtDirection(null, vocabulary)).toBeNull();
  });

  it("keeps the preset and drops the overrides it cannot use", () => {
    expect(
      readArtDirection(
        {
          preset: "editorial",
          accent: "cornflower blue",
          fontPair: "comic",
          radius: "bevelled",
          density: 3,
        },
        vocabulary,
      ),
    ).toEqual({ preset: "editorial" });
  });

  it("accepts an accent in any case and stores it in one", () => {
    expect(readArtDirection({ preset: "editorial", accent: "#2563EB" }, vocabulary)).toEqual(
      { preset: "editorial", accent: "#2563eb" },
    );
  });

  it("rejects a three-digit hex, which the editor's tokens cannot read", () => {
    expect(readArtDirection({ preset: "editorial", accent: "#abc" }, vocabulary)).toEqual({
      preset: "editorial",
    });
  });
});
