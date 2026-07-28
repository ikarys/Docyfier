/**
 * The two read-only calls an OpenAI-compatible server answers outside of
 * generation: what it offers, and whether it works at all. Both are used to
 * validate a provider before it is saved, and the first also feeds model
 * auto-detection.
 */

export interface ModelInfo {
  id: string;
}

/** Thrown by listModels() on a non-OK HTTP response; carries the status for callers that need to branch on it (e.g. 404 = no /models endpoint). */
export class ModelsEndpointError extends Error {
  constructor(public readonly status: number) {
    super(`LLM server responded ${status} on /models`);
  }
}

/** Models exposed by an OpenAI-compatible server. Throws on unreachable/HTTP errors. */
export async function listModels(
  baseUrl: string,
  apiKey?: string,
): Promise<ModelInfo[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new ModelsEndpointError(res.status);
  }
  const body = (await res.json()) as { data?: { id?: string }[] };
  return (body.data ?? [])
    .filter((m): m is { id: string } => typeof m.id === "string")
    .map((m) => ({ id: m.id }));
}

/**
 * Validate a server by sending a minimal chat completion. Unlike listModels,
 * this works on proxies without a /models endpoint (e.g. cline.bot) and proves
 * the base URL, API key and model id all actually work end-to-end. Throws on
 * any failure. Tolerates the "data" envelope some proxies wrap responses in.
 */
export async function pingChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      stream: false,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`LLM server responded ${res.status} on /chat/completions`);
  }
  const body = (await res.json()) as {
    choices?: unknown;
    data?: { choices?: unknown };
  };
  if (body.choices === undefined && body.data?.choices === undefined) {
    throw new Error("Unexpected chat-completion response (no choices)");
  }
}
