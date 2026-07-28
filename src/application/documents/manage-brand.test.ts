import { describe, expect, it } from "vitest";
import { InvalidBrandPreset } from "@/domain/documents/brand";
import { DEFAULT_PRESET } from "@/domain/documents/theme";
import { InMemoryBrandRepository } from "@/infrastructure/configuration/in-memory-brand-repository";
import type { BrandDeps } from "./deps";
import {
  brandRecord,
  removeBrandPreset,
  saveBrandPreset,
  savedPresets,
  setBrandTheme,
  themeForNewDocument,
} from "./manage-brand";

const TOKENS = {
  accent: "#008060",
  fontPair: "grotesk",
  radius: "round",
  density: "airy",
} as const;

function deps(): BrandDeps {
  return { brand: new InMemoryBrandRepository() };
}

describe("configuring the brand", () => {
  it("starts on the built-in default", async () => {
    expect(await themeForNewDocument(deps())).toEqual({ preset: DEFAULT_PRESET });
  });

  it("makes the saved theme the one new documents wear", async () => {
    const brand = deps();
    await setBrandTheme(brand, { preset: "vivid", overrides: { accent: "#008060" } });
    expect(await themeForNewDocument(brand)).toEqual({
      preset: "vivid",
      overrides: { accent: "#008060" },
    });
  });

  it("hands the default back when the theme is cleared", async () => {
    const brand = deps();
    await setBrandTheme(brand, "vivid");
    await setBrandTheme(brand, null);
    expect(await themeForNewDocument(brand)).toEqual({ preset: DEFAULT_PRESET });
  });

  it("saves a preset and offers it for resolution", async () => {
    const brand = deps();
    await saveBrandPreset(brand, { label: "Acme 2026", tokens: TOKENS });
    expect((await savedPresets(brand)).map((preset) => preset.id)).toEqual(["acme-2026"]);
    expect((await brandRecord(brand)).presets[0].label).toBe("Acme 2026");
  });

  it("removes a preset without touching the default theme", async () => {
    const brand = deps();
    await setBrandTheme(brand, "minimal");
    await saveBrandPreset(brand, { label: "Acme", tokens: TOKENS });
    await removeBrandPreset(brand, "acme");
    expect(await savedPresets(brand)).toEqual([]);
    expect(await themeForNewDocument(brand)).toEqual({ preset: "minimal" });
  });

  it("refuses a preset the entity refuses, and stores nothing", async () => {
    const brand = deps();
    await expect(saveBrandPreset(brand, { label: " ", tokens: TOKENS })).rejects.toThrow(
      InvalidBrandPreset,
    );
    expect(await savedPresets(brand)).toEqual([]);
  });
});
