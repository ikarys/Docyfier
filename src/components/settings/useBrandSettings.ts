"use client";

import { useState } from "react";
import {
  deleteBrandPresetAction,
  saveBrandPresetAction,
  saveBrandThemeAction,
} from "@/app/settings/style/actions";
import type { BrandRecord } from "@/lib/settings-types";
import { presetSkin, resolveTokens, type DocumentTheme, type Theme } from "@/lib/themes";

/**
 * The brand settings as a state machine, kept out of the form that renders it.
 *
 * Every command is the same shape — call the action, take the brand it hands
 * back as the new truth — so the page never drifts from what was stored.
 */
export interface BrandSettings {
  theme: DocumentTheme;
  presets: Theme[];
  /** Set while a command is in flight, so the form can disable its buttons. */
  busy: boolean;
  error: string | null;
  saved: boolean;
  changeTheme(theme: DocumentTheme): void;
  saveTheme(): Promise<void>;
  useBuiltInDefault(): Promise<void>;
  savePreset(label: string): Promise<void>;
  deletePreset(id: string): Promise<void>;
}

function presetsOf(brand: BrandRecord): Theme[] {
  return brand.presets.map((preset) => ({
    id: preset.id,
    label: preset.label,
    hint: "Saved on this instance.",
    skin: preset.base,
    tokens: preset.tokens,
  }));
}

export function useBrandSettings(
  initial: BrandRecord,
  fallback: DocumentTheme,
): BrandSettings {
  const [brand, setBrand] = useState(initial);
  const [theme, setTheme] = useState(initial.defaultTheme ?? fallback);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const presets = presetsOf(brand);

  async function run(command: () => Promise<BrandRecord | { error: string }>) {
    setBusy(true);
    setError(null);
    const result = await command();
    if ("error" in result) setError(result.error);
    else {
      setBrand(result);
      setSaved(true);
    }
    setBusy(false);
  }

  return {
    theme,
    presets,
    busy,
    error,
    saved,
    changeTheme(next) {
      setTheme(next);
      setSaved(false);
    },
    saveTheme: () => run(() => saveBrandThemeAction(theme)),
    useBuiltInDefault: () => run(() => saveBrandThemeAction(null)),
    /** The tokens currently on screen, stored under a name. */
    savePreset: (label) =>
      run(async () => {
        const result = await saveBrandPresetAction({
          label,
          base: presetSkin(theme.preset, presets),
          tokens: resolveTokens(theme, presets),
        });
        return "brand" in result ? result.brand : result;
      }),
    deletePreset: (id) => run(() => deleteBrandPresetAction(id)),
  };
}
