import type { ListModelsResult, TestChatResult } from "@/app/settings/ai/actions";

/**
 * What "test connection" concluded, and what the form does next.
 *
 * Two paths reach the same answer. Normally the server is asked for its model
 * list; a server that has no `/models` endpoint — several OpenAI-compatible
 * proxies do not — answers 404, which says nothing about whether the endpoint
 * works. So the form switches to a typed model id and proves it the only way
 * left: a minimal chat completion. Showing that 404 to a user would be a lie.
 */
export type Probe =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ok"; models: string[]; via?: "chat" }
  | { state: "error"; message: string; status?: number };

/** Settle on an answer, switch to a typed model id, or do both and try again. */
export type ProbePlan =
  | { probe: Probe }
  | { manual: true; probe: Probe }
  | { manual: true; retryAsChat: true };

export function afterModelList(result: ListModelsResult, model: string): ProbePlan {
  if (result.ok) {
    return { probe: { state: "ok", models: result.models.map((m) => m.id) } };
  }
  const failed: Probe = {
    state: "error",
    message: result.error,
    status: result.status,
  };
  if (result.status !== 404) return { probe: failed };
  return model.trim() ? { manual: true, retryAsChat: true } : { manual: true, probe: failed };
}

export function afterChat(result: TestChatResult, model: string): Probe {
  return result.ok
    ? { state: "ok", models: [model], via: "chat" }
    : { state: "error", message: result.error };
}

/** The typed-id path needs an id; answers the complaint, or null when there is one. */
export function missingModelId(model: string): Probe | null {
  return model.trim() ? null : { state: "error", message: "Enter a model id to test." };
}
