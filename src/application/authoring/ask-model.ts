import { jsonFromAnswer, plainFromAnswer } from "@/domain/authoring/model-answer";
import { retryPrompt } from "@/domain/authoring/prompts";
import {
  AnswerTruncated,
  ModelUnavailable,
  type GenerationRequest,
} from "@/domain/authoring/text-generator";
import type { DocumentBody, DocumentNode } from "@/domain/documents/body";
import type { AuthoringDeps } from "./deps";

/**
 * The shape every AI surface shares: ask, read what came back, and re-ask once
 * with the reason it was rejected.
 *
 * One retry, not more: a second failure means the model cannot produce this
 * answer, and a third request only makes the user wait longer for the same
 * error. This is where "invalid output → retry, never a broken editor" lives.
 *
 * Two kinds of answer come back, and they are read differently. A **document**
 * is text in the model's own format (STEP U14) and goes through `deps.reader`.
 * A **plan** — an op list, a layout plan, a brief — is still JSON, because it
 * is a handful of numbers and names rather than prose, and JSON is the shortest
 * way to say that.
 */

async function answer(
  deps: AuthoringDeps,
  request: GenerationRequest,
): Promise<string> {
  const { text, truncated } = await deps.generator.generate(request);
  if (truncated) {
    // Not "the document is too large": the ceiling is on the *answer*, and a
    // reasoning model can reach it having written nothing at all. Blaming the
    // input sends the reader to shrink something that was never the problem.
    throw new AnswerTruncated(
      "The answer was cut off at the output ceiling: the model ran out of budget before it finished. Raise it in Settings → AI providers; if that changes nothing, the model is spending that budget reasoning rather than writing — edit one section at a time with the selection menu.",
    );
  }
  return text;
}

/**
 * Ask, hand the answer to `read`, and re-ask once with the reason it failed.
 *
 * Reading the answer is inside the retry, not around it: an answer that is
 * malformed is exactly as retryable as one the schema rejects, and letting a
 * parser error escape puts "Expected double-quoted property name at position
 * 1021" in front of the user instead of a second, valid document.
 *
 * The two failures a second attempt cannot fix — an unreachable model, an
 * answer cut off by the output ceiling — are handed straight back.
 */
export async function askOnce<T>(
  deps: AuthoringDeps,
  request: GenerationRequest,
  read: (text: string) => T,
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0 ? request.prompt : retryPrompt(request.prompt, lastError);
    try {
      return read(await answer(deps, { ...request, prompt }));
    } catch (err) {
      if (err instanceof ModelUnavailable || err instanceof AnswerTruncated) throw err;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`The AI returned an invalid answer (${lastError})`);
}

/** Ask for a plan — an op list, a layout plan, a brief — which is still JSON. */
export function askJson<T>(
  deps: AuthoringDeps,
  request: GenerationRequest,
  read: (json: unknown) => T,
): Promise<T> {
  return askOnce(deps, request, (text) => read(jsonFromAnswer(text)));
}

/**
 * Model output → a body the editor can render: format read, schema proven.
 *
 * The fence comes off first. The contract says not to wrap the answer in one
 * and models mostly obey, but one that does would otherwise turn a whole
 * document into a single code block — an answer that parses, validates and is
 * completely wrong, which is the worst kind.
 *
 * An answer holding no block at all is refused rather than returned empty: it
 * is a failure the retry can do something about, and an empty document is not.
 */
export function bodyFromAnswer(deps: AuthoringDeps, text: string): DocumentBody {
  const blocks = deps.reader.read(plainFromAnswer(text));
  if (!blocks.length) throw new Error("The answer contained no blocks");
  return deps.validator.validate({ type: "doc", content: blocks });
}

/** The same, for a passage: the blocks alone, polished and proven. */
export function blocksFromAnswer(deps: AuthoringDeps, text: string): DocumentNode[] {
  return (polished(deps, bodyFromAnswer(deps, text)).content ?? []) as DocumentNode[];
}

/**
 * The deterministic formatting pass, which must never cost the answer: a
 * polished body that fails validation means the upgrade misfired, and the
 * model's own output is still worth showing.
 */
export function polished(deps: AuthoringDeps, body: DocumentBody): DocumentBody {
  try {
    return deps.validator.validate(deps.polisher.polish(body));
  } catch {
    return body;
  }
}

/** Ask for a document and hand back the polished, validated body. */
export function askDocument(
  deps: AuthoringDeps,
  request: GenerationRequest,
): Promise<DocumentBody> {
  return askOnce(deps, request, (text) => polished(deps, bodyFromAnswer(deps, text)));
}
