import type { ArtVocabulary } from "@/domain/authoring/art-direction";
import { defaultBrief, readBrief, type DocumentBrief } from "@/domain/authoring/brief";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { planPrompt, planSystem } from "@/domain/authoring/prompts";
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
export async function planDocument(
  deps: AuthoringDeps,
  request: string,
  vocabulary: ArtVocabulary,
): Promise<DocumentBrief> {
  try {
    const { text } = await deps.generator.generate({
      system: planSystem(vocabulary),
      prompt: planPrompt(request),
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
