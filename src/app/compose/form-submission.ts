import {
  fieldValue,
  type Composer,
  type ComposeContext,
  type ComposerValues,
} from "@/domain/composing/composer";
import {
  composeContext,
  GUIDANCE_KEY,
  INTENT_KEY,
  REVISING_KEY,
} from "@/domain/composing/submission";

/**
 * The composer form, read at the boundary. Everything inward of this file sees
 * typed values, never a `FormData`.
 */

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

/** How this run relates to the previous one, read from the shell's own keys. */
export function readComposeContext(form: FormData): ComposeContext {
  return composeContext({
    revising: text(form, REVISING_KEY),
    intent: text(form, INTENT_KEY),
    guidance: text(form, GUIDANCE_KEY),
  });
}

function text(form: FormData, key: string): string | null {
  const raw = form.get(key);
  return typeof raw === "string" ? raw : null;
}
