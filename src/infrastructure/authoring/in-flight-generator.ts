import type {
  GeneratedText,
  GenerationRequest,
  TextGenerator,
} from "@/domain/authoring/text-generator";

/**
 * One model call for one question, however many callers are waiting on it.
 *
 * A double click, a React double-invoke in development, a block action fired
 * twice from an impatient toolbar: the second request is byte-identical to the
 * first and would spend a second model call, a second wait and a second bill to
 * arrive at the same answer. It joins the first instead.
 *
 * Deliberately not a cache. Nothing survives the answer landing: the same
 * question asked a minute later is a different question, because the document
 * it is about has moved on. That is what makes this safe to put in front of a
 * generative model, where a stored answer would go quietly stale.
 */

type Pending = Map<string, Promise<unknown>>;

/** Two requests are the same question when every field a model sees matches. */
function questionOf(request: GenerationRequest): string {
  return JSON.stringify([
    request.system,
    request.prompt,
    request.temperature,
    request.effort ?? null,
  ]);
}

function share<T>(pending: Pending, question: string, call: () => Promise<T>): Promise<T> {
  const waiting = pending.get(question) as Promise<T> | undefined;
  if (waiting) return waiting;

  // Registered before the first `await` so a second caller in the same tick
  // finds it, and dropped in `finally` so a failure is never the answer given
  // to the next request.
  const started = call().finally(() => pending.delete(question));
  pending.set(question, started);
  return started;
}

export function sharingInFlightCalls(generator: TextGenerator): TextGenerator {
  const pending: Pending = new Map();

  return {
    generate(request: GenerationRequest): Promise<GeneratedText> {
      return share(pending, questionOf(request), () => generator.generate(request));
    },
  };
}
