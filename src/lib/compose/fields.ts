import type { ComposeContext, ComposerField } from "./types";

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

/**
 * The task block for a run that iterates on a previous answer. Shared so
 * "improve this" means the same thing in every composer, and so a composer only
 * has to decide where it goes in its own system prompt.
 */
export function revisionRule(context: ComposeContext): string {
  const task = `Task: the text below is your own previous answer, and the user may have edited it by hand. Re-emit it whole, improved. Keep every fact, request and commitment it carries, and keep the user's edits — they are deliberate. Apply the rules above to the whole text, not only to what you change.`;
  return context.guidance
    ? `${task}

The user asked for this, and it wins over the tone, length and format settings
above wherever the two disagree:
${context.guidance}`
    : task;
}

/** A labelled block of user input, skipped when the value is empty. */
export function section(label: string, value: string): string {
  return value ? `${label}:\n${value}\n` : "";
}
