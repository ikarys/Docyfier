/**
 * The colours a writer may put on text (PLAN.md STEP U9).
 *
 * One list, used by the toolbar and by the selection bubble: two places to
 * choose a colour, one place that decides which colours exist. They are picked
 * to sit beside any theme accent rather than fight it.
 */

export interface Swatch {
  readonly hex: string;
  readonly label: string;
}

export const TEXT_COLORS: Swatch[] = [
  { hex: "#3b5bdb", label: "Blue" },
  { hex: "#1f9d6b", label: "Green" },
  { hex: "#c23b3b", label: "Red" },
  { hex: "#b4690e", label: "Amber" },
  { hex: "#7048e8", label: "Violet" },
];

export const HIGHLIGHT_COLORS: Swatch[] = [
  { hex: "#fff3bf", label: "Yellow" },
  { hex: "#e9f7f0", label: "Green" },
  { hex: "#fbecec", label: "Red" },
  { hex: "#eef2fe", label: "Blue" },
  { hex: "#f3f0ff", label: "Violet" },
];
