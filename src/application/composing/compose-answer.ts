import {
  DEFAULT_TEMPERATURE,
  missingRequiredField,
  toComposerInfo,
  type ComposeContext,
  type Composer,
  type ComposerInfo,
  type ComposerValues,
} from "@/domain/composing/composer";
import type { DocumentBody } from "@/domain/documents/body";
import type { ComposingDeps } from "./deps";

/**
 * Running one composer: refuse what the form did not fill in, build the prompt,
 * and hand the model's Markdown back as a document. The composer itself never
 * meets the model — that is what the ports are for.
 */

export type ComposeOutcome =
  | { ok: true; doc: DocumentBody }
  | { ok: false; error: string };

/** One composer as plain data, or `null` when the id is unknown. */
export function availableComposer(
  deps: ComposingDeps,
  composerId: string,
): ComposerInfo | null {
  const composer = find(deps, composerId);
  return composer ? toComposerInfo(composer) : null;
}

/** Run one composer over its submitted values. Throws only what the model port
 * throws — a missing field or an unknown composer is an outcome, not a crash. */
export async function composeAnswer(
  deps: ComposingDeps,
  composerId: string,
  values: ComposerValues,
  context: ComposeContext,
): Promise<ComposeOutcome> {
  const composer = find(deps, composerId);
  if (!composer) return { ok: false, error: "Unknown composer" };

  const missing = missingRequiredField(composer, values);
  if (missing) return { ok: false, error: `${missing} is required.` };

  const { system, prompt, temperature } = composer.build(values, context);
  const markdown = await deps.writer.write({
    system,
    prompt,
    temperature: temperature ?? DEFAULT_TEMPERATURE,
  });
  // The answer goes back into an editor, so it lands as a document — parsed on
  // the same path an imported markdown file takes.
  return { ok: true, doc: await deps.parser.parse(markdown) };
}

function find(deps: ComposingDeps, composerId: string): Composer | undefined {
  return deps.composers.find((composer) => composer.id === composerId);
}
