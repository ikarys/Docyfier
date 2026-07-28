import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET,
  FONT_PAIRS,
  THEMES,
  findFontPair,
  findPreset,
  normalizeTheme,
  presetSkin,
  resolveTokens,
  type Theme,
} from "./theme";

/**
 * Themes are read from disk, where documents written before STEP U3 hold the
 * legacy string form and nothing guarantees the rest. `normalizeTheme` is the
 * single repair point: no render site may ever see a shape it must fix.
 */
describe("normalizeTheme", () => {
  it("upgrades the pre-U3 string form", () => {
    expect(normalizeTheme("corporate")).toEqual({ preset: "corporate" });
  });

  it("falls back to the default preset for anything that is not an id", () => {
    expect(normalizeTheme(undefined)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme(null)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme(42)).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme("Not An Id")).toEqual({ preset: DEFAULT_PRESET });
    expect(normalizeTheme({ preset: { id: "corporate" } })).toEqual({
      preset: DEFAULT_PRESET,
    });
  });

  it("keeps an id it does not know, because the instance saves presets of its own", () => {
    expect(normalizeTheme("acme-2026")).toEqual({ preset: "acme-2026" });
    expect(normalizeTheme({ preset: "acme-2026" })).toEqual({ preset: "acme-2026" });
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

const SAVED: Theme = {
  id: "acme-2026",
  label: "Acme 2026",
  hint: "The house style.",
  skin: "corporate",
  tokens: { accent: "#008060", fontPair: "grotesk", radius: "round", density: "airy" },
};

describe("findPreset", () => {
  it("finds a preset by id", () => {
    expect(findPreset("corporate").id).toBe("corporate");
  });

  it("always returns a theme, so no caller has to handle undefined", () => {
    expect(findPreset("nope").id).toBe(DEFAULT_PRESET);
    expect(findPreset(undefined).id).toBe(DEFAULT_PRESET);
  });

  it("finds a preset the instance saved", () => {
    expect(findPreset("acme-2026", [SAVED])).toBe(SAVED);
  });

  it("never lets a saved preset shadow a built-in one", () => {
    const impostor = { ...SAVED, id: "corporate" };
    expect(findPreset("corporate", [impostor]).label).toBe("Corporate");
  });
});

describe("presetSkin", () => {
  it("gives a built-in preset its own id", () => {
    expect(presetSkin("minimal")).toBe("minimal");
  });

  it("gives a saved preset the look it borrows", () => {
    expect(presetSkin("acme-2026", [SAVED])).toBe("corporate");
  });

  it("falls back with the preset when the id names nothing", () => {
    expect(presetSkin("acme-2026")).toBe(DEFAULT_PRESET);
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

  it("resolves a saved preset, so editing it repaints every document using it", () => {
    expect(resolveTokens({ preset: "acme-2026" }, [SAVED])).toEqual(SAVED.tokens);
  });

  it("falls back to the default tokens when the saved preset is gone", () => {
    expect(resolveTokens({ preset: "acme-2026" })).toEqual(findPreset(DEFAULT_PRESET).tokens);
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
