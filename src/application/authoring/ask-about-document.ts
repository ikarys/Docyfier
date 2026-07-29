import { QUESTION_SYSTEM, questionPrompt } from "@/domain/authoring/prompts";
import { askJson } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/**
 * Surface 6 — asking the document a question (PLAN.md STEP U11).
 *
 * Grounded on the digest, so the answer costs a fraction of a transform, and
 * read-only by construction: this use case returns prose and the headings it
 * came from. Putting any of it into the document is another surface's decision.
 */

export interface DocumentAnswer {
  readonly answer: string;
  /** The headings the answer came from; empty when it came from none. */
  readonly sections: string[];
}

export function askAboutDocument(
  deps: AuthoringDeps,
  digest: string,
  question: string,
): Promise<DocumentAnswer> {
  return askJson(
    deps,
    {
      system: QUESTION_SYSTEM,
      prompt: questionPrompt(digest, question),
      temperature: 0.2,
      // An answer object is not a document: no provider document mode fits it.
      shape: "free",
    },
    readAnswer,
  );
}

/** An answer with nothing in it is an answer the retry loop can still fix. */
function readAnswer(json: unknown): DocumentAnswer {
  const { answer, sections } = (json ?? {}) as { answer?: unknown; sections?: unknown };
  if (typeof answer !== "string" || answer.trim() === "") {
    throw new Error('Expected {"answer": "…"} with something in it');
  }
  return {
    answer: answer.trim(),
    sections: Array.isArray(sections)
      ? sections.filter((name): name is string => typeof name === "string")
      : [],
  };
}
