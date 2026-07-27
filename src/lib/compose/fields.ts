import type { ComposerField } from "./types";

/**
 * Fields every composer needs, and the prompt line each one turns into.
 * Shared here rather than copied per composer so "the output language" means
 * the same thing in every flow.
 */

export const languageField: ComposerField = {
  id: "language",
  label: "Language",
  type: "select",
  default: "auto",
  choices: [
    { value: "auto", label: "Same as my input" },
    { value: "French", label: "French" },
    { value: "English", label: "English" },
    { value: "German", label: "German" },
    { value: "Spanish", label: "Spanish" },
    { value: "Italian", label: "Italian" },
  ],
};

export function languageRule(value: string): string {
  return value === "auto"
    ? "Write in the same language as the input."
    : `Write in ${value}, whatever language the input is in.`;
}

/** A labelled block of user input, skipped when the value is empty. */
export function section(label: string, value: string): string {
  return value ? `${label}:\n${value}\n` : "";
}
