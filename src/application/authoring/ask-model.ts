import {
  boldFromMarkdown,
  jsonFromAnswer,
  wrapInDoc,
} from "@/domain/authoring/model-answer";
import { retryPrompt } from "@/domain/authoring/prompts";
import type { GenerationRequest } from "@/domain/authoring/text-generator";
import type { DocumentBody, DocumentNode } from "@/domain/documents/body";
import type { AuthoringDeps } from "./deps";

/**
 * The shape every AI surface shares: ask, read what came back, and re-ask once
 * with the reason it was rejected.
 *
 * One retry, not more: a second failure means the model cannot produce this
 * answer, and a third request only makes the user wait longer for the same
 * error. This is where "invalid output → retry, never a broken editor" lives.
 */

/** A model answer as JSON, through the provider's JSON mode when it has one. */
async function jsonAnswer(
  deps: AuthoringDeps,
  request: GenerationRequest,
): Promise<unknown> {
  const structured = await deps.generator.generateJson(request);
  if (structured !== null) return structured;

  const { text, truncated } = await deps.generator.generate(request);
  if (truncated) {
    // Retrying cannot help: the answer does not fit the output budget.
    throw new Error(
      "The document is too large for a whole-document edit — select the section to change and use the selection menu instead.",
    );
  }
  return jsonFromAnswer(text);
}

/** Ask for JSON, hand it to `read`, and re-ask once with the parse error. */
export async function askJson<T>(
  deps: AuthoringDeps,
  request: GenerationRequest,
  read: (json: unknown) => T,
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0 ? request.prompt : retryPrompt(request.prompt, lastError);
    const json = await jsonAnswer(deps, { ...request, prompt });
    try {
      return read(json);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`The AI returned an invalid answer (${lastError})`);
}

/** Model output → a body the editor can render: envelope repaired, markdown
 * artifacts turned into marks, schema proven. */
export function bodyFromJson(deps: AuthoringDeps, json: unknown): DocumentBody {
  return deps.validator.validate(boldFromMarkdown(wrapInDoc(json) as DocumentNode));
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
  request: Omit<GenerationRequest, "shape">,
): Promise<DocumentBody> {
  return askJson(deps, { ...request, shape: "document" }, (json) =>
    polished(deps, bodyFromJson(deps, json)),
  );
}
