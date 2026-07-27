/**
 * Composers — the contract behind the dedicated flows (PLAN.md STEP 8).
 *
 * A composer is one short-form writing task the user does outside a document:
 * an email, a ticket. It owns its form fields and the prompt they build, and
 * nothing else — no AI client, no storage, no `next/*`. `build` is a pure
 * function of the submitted values, so a composer can be reasoned about and
 * exercised without a model behind it.
 *
 * Output is plain text on purpose: the point of these flows is a payload the
 * user pastes into their mail client or their tracker, not another document.
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
  /** Defaults to 0.4 — these flows favour predictable wording over invention. */
  temperature?: number;
}

export interface Composer {
  id: string;
  label: string;
  description: string;
  /** One line under the page title. */
  lede: string;
  /** What to do with the result, shown above the copy box. */
  instructions: string;
  fields: ComposerField[];
  build(values: ComposerValues): ComposerPrompt;
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
}

export function toComposerInfo(composer: Composer): ComposerInfo {
  return {
    id: composer.id,
    label: composer.label,
    description: composer.description,
    lede: composer.lede,
    instructions: composer.instructions,
    fields: composer.fields,
  };
}

/** The output contract every composer shares: text, ready to paste. */
export const PLAIN_OUTPUT_RULES = `OUTPUT RULES — follow exactly:
- Output the finished text and nothing else: no preamble, no closing remark, no
  explanation of your choices, no markdown code fence around the whole answer.
- Never invent facts, names, dates, figures, deadlines or commitments that are
  not in the input. When something essential is missing, leave a short bracketed
  placeholder such as [date] instead of guessing.`;

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

/**
 * The submitted form as values, read against the composer's declared fields
 * rather than against the submitted keys — an unknown key is simply not read.
 */
export function readComposerValues(
  composer: Composer,
  form: FormData,
): ComposerValues {
  const values: ComposerValues = {};
  for (const field of composer.fields) {
    const raw = form.get(field.id);
    values[field.id] = fieldValue(field, {
      [field.id]: typeof raw === "string" ? raw : "",
    });
  }
  return values;
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
