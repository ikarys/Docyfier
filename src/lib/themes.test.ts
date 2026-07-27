import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET,
  FONT_PAIRS,
  THEMES,
  findFontPair,
  findPreset,
  normalizeTheme,
  resolveTokens,
  tokenStyle,
} from "./themes";

/**
 * Themes are read from disk, where documents written before STEP U3 hold the
 * legacy string form and nothing guarantees the rest. `normalizeTheme` is the
 * single repair point: no render site may ever see a shape it must fix.
 */
describe("normalizeTheme", () => {
  it("upgrades the pre-U3 string form", () => {
    expect(normalizeTheme("corporate")).toEqual({ preset: "corporate" });
  });

  it("falls back to the default preset for anything unusable", () => {
    expect(normalizeTheme(undefined)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme(null)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme(42)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme("no-such-preset")).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme({ preset: "no-such-preset" })).toEqual({
      preset: DEFAULT_PRESET,
    });
  });

  it("keeps the overrides that are valid tokens", () => {
    expect(
      normalizeTheme({
        preset: "minimal",
        overrides: { accent: "#0F62FE", radius: "round", density: "airy" },
      }),
    ).toEqual({
      preset: "minimal",
      overrides: { accent: "#0F62FE", radius: "round", density: "airy" },
    });
  });

  it("drops an accent that is not a six-digit hex colour", () => {
    expect(normalizeTheme({ preset: "minimal", overrides: { accent: "red" } })).toEqual({
      preset: "minimal",
    });
    expect(normalizeTheme({ preset: "minimal", overrides: { accent: "#fff" } })).toEqual({
      preset: "minimal",
    });
  });

  it("drops a radius, density or font pair the renderer has no value for", () => {
    const overrides = { radius: "huge", density: "tight", fontPair: "comic" };
    expect(normalizeTheme({ preset: "minimal", overrides })).toEqual({
      preset: "minimal",
    });
  });

  it("keeps the valid overrides and drops only the bad ones", () => {
    expect(
      normalizeTheme({ preset: "minimal", overrides: { accent: "#000000", radius: "x" } }),
    ).toEqual({ preset: "minimal", overrides: { accent: "#000000" } });
  });

  it("omits the overrides key entirely when nothing survives", () => {
    expect(normalizeTheme({ preset: "minimal", overrides: {} })).not.toHaveProperty(
      "overrides",
    );
    expect(normalizeTheme({ preset: "minimal", overrides: "nope" })).not.toHaveProperty(
      "overrides",
    );
  });
});

describe("findPreset", () => {
  it("finds a preset by id", () => {
    expect(findPreset("corporate").id).toBe("corporate");
  });

  it("always returns a theme, so no caller has to handle undefined", () => {
    expect(findPreset("nope").id).toBe(DEFAULT_PRESET);
    expect(findPreset(undefined).id).toBe(DEFAULT_PRESET);
  });
});

describe("findFontPair", () => {
  it("finds a pair by id and falls back to the first one", () => {
    expect(findFontPair("serif").id).toBe("serif");
    expect(findFontPair("comic")).toBe(FONT_PAIRS[0]);
  });
});

describe("resolveTokens", () => {
  it("returns the preset's tokens when the document overrides nothing", () => {
    expect(resolveTokens({ preset: "corporate" })).toEqual(findPreset("corporate").tokens);
  });

  it("lets an override win over the preset, token by token", () => {
    const tokens = resolveTokens({ preset: "corporate", overrides: { accent: "#123456" } });
    expect(tokens.accent).toBe("#123456");
    expect(tokens.fontPair).toBe(findPreset("corporate").tokens.fontPair);
  });
});

describe("tokenStyle", () => {
  it("emits the custom properties globals.css consumes", () => {
    const style = tokenStyle(resolveTokens({ preset: DEFAULT_PRESET }));
    expect(Object.keys(style).sort()).toEqual([
      "--doc-accent",
      "--doc-font-body",
      "--doc-font-heading",
      "--doc-radius",
      "--doc-space",
    ]);
  });

  it("maps the token vocabulary onto CSS values", () => {
    const style = tokenStyle({
      accent: "#123456",
      fontPair: "serif",
      radius: "sharp",
      density: "compact",
    }) as Record<string, string>;
    expect(style["--doc-accent"]).toBe("#123456");
    expect(style["--doc-radius"]).toBe("2px");
    expect(style["--doc-space"]).toBe("0.78");
    expect(style["--doc-font-heading"]).toBe(findFontPair("serif").heading);
  });
});

describe("THEMES", () => {
  it("ships the default preset it falls back to", () => {
    expect(THEMES.some((theme) => theme.id === DEFAULT_PRESET)).toBe(true);
  });

  it("has no duplicate id, and every preset points at a real font pair", () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of THEMES) {
      expect(FONT_PAIRS.some((pair) => pair.id === theme.tokens.fontPair)).toBe(true);
      expect(theme.tokens.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
