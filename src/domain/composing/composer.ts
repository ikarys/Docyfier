import type { ComposeClipboard } from "./clipboard-format";

/**
 * Composers — the contract behind the dedicated flows (PLAN.md STEP 8).
 *
 * A composer is one short-form writing task the user does outside a document:
 * an email, a ticket. It owns its form fields and the prompt they build, and
 * nothing else — no AI client, no storage, no framework. `build` is a pure
 * function of the submitted values, so a composer can be reasoned about and
 * exercised without a model behind it.
 *
 * The answer is a document, edited in a real editor like any other, but it
 * never becomes a stored document: it ends in the clipboard, converted to the
 * markup its destination understands.
 */

export interface ComposerChoice {
  value: string;
  label: string;
}

export interface ComposerField {
  id: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "select";
  /** Required for `select`; ignored otherwise. */
  choices?: ComposerChoice[];
  default?: string;
  required?: boolean;
  placeholder?: string;
  /** Height of a `textarea`, in rows. */
  rows?: number;
}

export type ComposerValues = Record<string, string>;

export interface ComposerPrompt {
  system: string;
  prompt: string;
  /** Defaults to `DEFAULT_TEMPERATURE` — these flows favour predictable
   * wording over invention. */
  temperature?: number;
}

/** What every composer settles for when it names no temperature of its own. */
export const DEFAULT_TEMPERATURE = 0.4;

/**
 * What a run knows beyond the form values: whether it iterates on a previous
 * answer, and what the user asked to change on it.
 */
export interface ComposeContext {
  /** The output field holds an answer this composer produced, not a brief. */
  revising: boolean;
  /** The user's instructions for this pass. Empty on a plain re-run. */
  guidance: string;
}

export interface Composer {
  id: string;
  label: string;
  description: string;
  /** One line under the page title. */
  lede: string;
  /** How to read the answer, shown under the field once there is one. */
  instructions: string;
  fields: ComposerField[];
  /**
   * The field the answer is written back into, so the user keeps iterating in
   * one place instead of reading a dead copy of it. Must name a `textarea`:
   * it is the one the editor replaces.
   */
  outputField: string;
  clipboard: ComposeClipboard;
  build(values: ComposerValues, context: ComposeContext): ComposerPrompt;
}

/**
 * The serializable half of a composer. Client components get this — never the
 * composer itself, whose `build` would drag every prompt into the browser
 * bundle.
 */
export interface ComposerInfo {
  id: string;
  label: string;
  description: string;
  lede: string;
  instructions: string;
  fields: ComposerField[];
  outputField: string;
  clipboard: ComposeClipboard;
}

export function toComposerInfo(composer: Composer): ComposerInfo {
  return {
    id: composer.id,
    label: composer.label,
    description: composer.description,
    lede: composer.lede,
    instructions: composer.instructions,
    fields: composer.fields,
    outputField: composer.outputField,
    clipboard: composer.clipboard,
  };
}

/** Longest accepted value per field type — a guard on the prompt budget, not a
 * UI constraint: the form itself does not cap what the user types. */
const MAX_LENGTH: Record<ComposerField["type"], number> = {
  text: 300,
  textarea: 8000,
  select: 100,
};

/**
 * One field's submitted value, falling back to its default.
 *
 * A `select` only ever yields one of its declared choices: the value reaches a
 * prompt, and a crafted POST must not be able to write into it.
 */
export function fieldValue(
  field: ComposerField,
  values: ComposerValues,
  fallbackToDefault = true,
): string {
  const raw = (values[field.id] ?? "").trim().slice(0, MAX_LENGTH[field.type]);
  const fallback = fallbackToDefault ? (field.default ?? "") : "";
  if (field.type === "select") {
    return field.choices?.some((choice) => choice.value === raw) ? raw : fallback;
  }
  return raw || fallback;
}

/** The label of the first required field left empty, or `null`. */
export function missingRequiredField(
  composer: Composer,
  values: ComposerValues,
): string | null {
  const missing = composer.fields.find(
    (field) => field.required && !fieldValue(field, values, false),
  );
  return missing ? missing.label : null;
}
