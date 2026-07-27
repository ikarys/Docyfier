import "server-only";
import type { JSONContent } from "@tiptap/core";
import { completePlainText } from "@/lib/ai/service";
import { docFromMarkdown } from "@/lib/doc/import";
import { toPlainJSON } from "@/lib/doc/plain";
import { findComposer } from "./registry";
import {
  missingRequiredField,
  toComposerInfo,
  type ComposeContext,
  type ComposerInfo,
  type ComposerValues,
} from "./types";

/**
 * The one place that joins the composer registry with the model. Pages and the
 * server action ask here instead of building a prompt and calling the AI side
 * by side.
 */

export type ComposeOutcome =
  | { ok: true; doc: JSONContent }
  | { ok: false; error: string };

/** One composer as plain data, or `null` when the id is unknown. */
export function availableComposer(composerId: string): ComposerInfo | null {
  const composer = findComposer(composerId);
  return composer ? toComposerInfo(composer) : null;
}

/** Run one composer over its submitted values. Throws only what the AI layer
 * throws — a missing field or an unknown composer is an outcome, not a crash. */
export async function compose(
  composerId: string,
  values: ComposerValues,
  context: ComposeContext = { revising: false, guidance: "" },
): Promise<ComposeOutcome> {
  const composer = findComposer(composerId);
  if (!composer) return { ok: false, error: "Unknown composer" };

  const missing = missingRequiredField(composer, values);
  if (missing) return { ok: false, error: `${missing} is required.` };

  const { system, prompt, temperature } = composer.build(values, context);
  const markdown = await completePlainText(system, prompt, temperature ?? 0.4);
  // The answer goes back into an editor, so it lands as document JSON — parsed
  // and validated on the same path an imported markdown file takes.
  return { ok: true, doc: toPlainJSON(await docFromMarkdown(markdown)) };
}
