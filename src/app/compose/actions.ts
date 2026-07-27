"use server";

import { requireAuth } from "@/lib/auth";
import { findComposer } from "@/lib/compose/registry";
import { compose } from "@/lib/compose/service";
import { readComposerValues } from "@/lib/compose/types";

/** Server action behind the composers (PLAN.md STEP 8). */

export type ComposeState = { text?: string; error?: string } | null;

export async function composeAction(
  _previous: ComposeState,
  form: FormData,
): Promise<ComposeState> {
  await requireAuth();

  const composerId = form.get("composer");
  const composer =
    typeof composerId === "string" ? findComposer(composerId) : undefined;
  if (!composer) return { error: "Unknown composer" };

  try {
    const result = await compose(composer.id, readComposerValues(composer, form));
    return result.ok ? { text: result.text } : { error: result.error };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI request failed" };
  }
}
