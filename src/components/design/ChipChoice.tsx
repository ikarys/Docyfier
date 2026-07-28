"use client";

import type { ThemeDensity, ThemeRadius } from "@/lib/themes";

/** The token choices that read as a row of chips: pick one, it applies live. */

export interface Choice<T extends string> {
  id: T;
  label: string;
}

export const DENSITY_CHOICES: Choice<ThemeDensity>[] = [
  { id: "compact", label: "Compact" },
  { id: "normal", label: "Normal" },
  { id: "airy", label: "Airy" },
];

export const RADIUS_CHOICES: Choice<ThemeRadius>[] = [
  { id: "sharp", label: "Sharp" },
  { id: "soft", label: "Soft" },
  { id: "round", label: "Round" },
];

export function ChipChoice<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <section className="design-section">
      <h3 className="design-label">{label}</h3>
      <div className="design-radio-row">
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            className={choice.id === value ? "chip is-active" : "chip"}
            onClick={() => onChange(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </section>
  );
}
