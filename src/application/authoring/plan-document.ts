import type { ArtDirection, ArtVocabulary } from "@/domain/authoring/art-direction";
import { defaultBrief, readBrief, type DocumentBrief } from "@/domain/authoring/brief";
import { digestOf } from "@/domain/authoring/document-digest";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { planPrompt, planSystem, restylePrompt } from "@/domain/authoring/prompts";
import type { DocumentBody } from "@/domain/documents/body";
import type { AuthoringDeps } from "./deps";

/**
 * The pass before the writing pass (PLAN.md STEP U7): decide what the document
 * is — its kind, its audience, its sections, its dress.
 *
 * Asked once, and never retried. Unlike a document, a plan has no schema the
 * user would notice the absence of: a model that cannot produce one costs the
 * document its plan, and the writer falls back on the default recipe rather
 * than making the user wait through a second round-trip for a hint.
 */
async function askPlan(
  deps: AuthoringDeps,
  prompt: string,
  vocabulary: ArtVocabulary,
): Promise<DocumentBrief> {
  try {
    const { text } = await deps.generator.generate({
      system: planSystem(vocabulary),
      prompt,
      // Warm enough to pick a dress that fits, cold enough to stay a plan.
      temperature: 0.4,
      shape: "free",
    });
    return readBrief(jsonFromAnswer(text), vocabulary);
  } catch {
    // Including an unreachable model: the writing call will report that.
    return defaultBrief();
  }
}

/** Plan a document that does not exist yet, from the request for it. */
export function planDocument(
  deps: AuthoringDeps,
  request: string,
  vocabulary: ArtVocabulary,
): Promise<DocumentBrief> {
  return askPlan(deps, planPrompt(request), vocabulary);
}

/**
 * Dress a document that already exists. The same planner reads a digest of it
 * instead of a request, and only its art direction is kept: the sections are
 * the document's own, and no word of it changes.
 */
export async function restyleDocument(
  deps: AuthoringDeps,
  body: DocumentBody,
  vocabulary: ArtVocabulary,
): Promise<ArtDirection | null> {
  const brief = await askPlan(deps, restylePrompt(digestOf(body)), vocabulary);
  return brief.art;
}
