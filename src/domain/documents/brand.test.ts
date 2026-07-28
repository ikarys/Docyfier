import { describe, expect, it } from "vitest";
import { Brand, InvalidBrandPreset } from "./brand";
import { DEFAULT_PRESET, findPreset, resolveTokens } from "./theme";

const TOKENS = {
  accent: "#008060",
  fontPair: "grotesk",
  radius: "round",
  density: "airy",
} as const;

describe("a brand with nothing configured", () => {
  it("dresses a new document in the built-in default", () => {
    expect(Brand.empty().themeForNewDocument()).toEqual({ preset: DEFAULT_PRESET });
  });

  it("has no preset of its own", () => {
    expect(Brand.empty().presets).toEqual([]);
  });
});

describe("the default theme", () => {
  it("becomes what every new document wears", () => {
    const brand = Brand.empty().withDefaultTheme({
      preset: "minimal",
      overrides: { accent: "#123456" },
    });
    expect(brand.themeForNewDocument()).toEqual({
      preset: "minimal",
      overrides: { accent: "#123456" },
    });
  });

  it("is repaired like any other theme rather than refused", () => {
    const brand = Brand.empty().withDefaultTheme({ preset: 42, overrides: { radius: "x" } });
    expect(brand.themeForNewDocument()).toEqual({ preset: DEFAULT_PRESET });
  });

  it("can be handed back to the built-in default", () => {
    const brand = Brand.empty().withDefaultTheme("minimal").withoutDefaultTheme();
    expect(brand.defaultTheme).toBeNull();
    expect(brand.themeForNewDocument()).toEqual({ preset: DEFAULT_PRESET });
  });
});

describe("saved presets", () => {
  it("names a preset after its label", () => {
    const brand = Brand.empty().savePreset({ label: "Acme 2026", tokens: TOKENS });
    expect(brand.presets[0].id).toBe("acme-2026");
    expect(brand.presets[0].label).toBe("Acme 2026");
  });

  it("resolves as a full token set, so a document can point at it", () => {
    const brand = Brand.empty().savePreset({ label: "Acme", tokens: TOKENS });
    expect(resolveTokens({ preset: "acme" }, brand.presets)).toEqual(TOKENS);
  });

  it("borrows the look of a built-in preset", () => {
    const brand = Brand.empty().savePreset({
      label: "Acme",
      base: "vivid",
      tokens: TOKENS,
    });
    expect(brand.presets[0].skin).toBe("vivid");
  });

  it("falls back to the default look when the base names nothing", () => {
    const brand = Brand.empty().savePreset({ label: "Acme", base: "nope", tokens: TOKENS });
    expect(brand.presets[0].skin).toBe(DEFAULT_PRESET);
  });

  it("fills the tokens the caller left out from the base preset", () => {
    const brand = Brand.empty().savePreset({
      label: "Acme",
      base: "minimal",
      tokens: { accent: "#008060", radius: "nonsense" },
    });
    expect(brand.presets[0].tokens).toEqual({
      ...findPreset("minimal").tokens,
      accent: "#008060",
    });
  });

  it("keeps two presets with the same label apart", () => {
    const brand = Brand.empty()
      .savePreset({ label: "Acme", tokens: TOKENS })
      .savePreset({ label: "Acme", tokens: TOKENS });
    expect(brand.presets.map((p) => p.id)).toEqual(["acme", "acme-2"]);
  });

  it("never takes the id of a built-in preset", () => {
    const brand = Brand.empty().savePreset({ label: "Minimal", tokens: TOKENS });
    expect(brand.presets[0].id).toBe("minimal-2");
  });

  it("names a preset whose label carries no letters", () => {
    const brand = Brand.empty().savePreset({ label: "★★★", tokens: TOKENS });
    expect(brand.presets[0].id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it("updates a preset in place when its id is given, keeping its position", () => {
    const brand = Brand.empty()
      .savePreset({ label: "First", tokens: TOKENS })
      .savePreset({ label: "Second", tokens: TOKENS })
      .savePreset({ id: "first", label: "Renamed", tokens: { ...TOKENS, radius: "sharp" } });
    expect(brand.presets.map((p) => p.id)).toEqual(["first", "second"]);
    expect(brand.presets[0].label).toBe("Renamed");
    expect(brand.presets[0].tokens.radius).toBe("sharp");
  });

  it("refuses a label that says nothing", () => {
    expect(() => Brand.empty().savePreset({ label: "   ", tokens: TOKENS })).toThrow(
      InvalidBrandPreset,
    );
  });

  it("refuses to grow past the number of presets a picker can show", () => {
    let brand = Brand.empty();
    for (let i = 0; i < 12; i++) brand = brand.savePreset({ label: `P${i}`, tokens: TOKENS });
    expect(() => brand.savePreset({ label: "One too many", tokens: TOKENS })).toThrow(
      InvalidBrandPreset,
    );
  });

  it("removes a preset, and ignores an id it does not hold", () => {
    const brand = Brand.empty().savePreset({ label: "Acme", tokens: TOKENS });
    expect(brand.removePreset("acme").presets).toEqual([]);
    expect(brand.removePreset("nope").presets).toHaveLength(1);
  });
});

describe("restoring what was stored", () => {
  it("round-trips through its record", () => {
    const brand = Brand.empty()
      .withDefaultTheme({ preset: "vivid" })
      .savePreset({ label: "Acme", base: "minimal", tokens: TOKENS });
    expect(Brand.restore(brand.toRecord()).toRecord()).toEqual(brand.toRecord());
  });

  it("reads a file that was never written", () => {
    expect(Brand.restore(undefined).toRecord()).toEqual(Brand.empty().toRecord());
  });

  it("drops what cannot be a preset instead of failing to load", () => {
    const brand = Brand.restore({
      defaultTheme: "minimal",
      presets: [{ label: "" }, 7, { id: "acme", label: "Acme", tokens: TOKENS }],
    });
    expect(brand.presets.map((p) => p.id)).toEqual(["acme"]);
    expect(brand.defaultTheme).toEqual({ preset: "minimal" });
  });
});
