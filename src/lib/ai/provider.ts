import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { getAiSettings } from "@/lib/settings";

/**
 * LLM provider abstraction (PLAN.md STEP 0/2). Targets any OpenAI-compatible
 * server (LM Studio by default), configured in Settings; swapping providers
 * later (BYO LLM, STEP 7) only touches this module.
 */

export async function llmBaseUrl(): Promise<string> {
  return (await getAiSettings()).baseUrl;
}

/**
 * How long one model call may take before it is abandoned.
 *
 * Without a deadline a provider that accepts the connection and then stops
 * answering hangs the request for as long as the process lives: the editor
 * shows "Rewriting…" forever, with no error and no way to retry. Generous
 * enough for a long document on a slow endpoint, finite enough that a stalled
 * proxy surfaces as a message. Override with `DOCYFIER_LLM_TIMEOUT_MS`.
 */
const DEFAULT_TIMEOUT_MS = 90_000;

export function callTimeoutMs(): number {
  const configured = Number(process.env.DOCYFIER_LLM_TIMEOUT_MS);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

/**
 * Options every generation call passes.
 *
 * The retry budget matters as much as the deadline: these calls sit inside
 * retry loops of their own, so the SDK default of two retries would turn one
 * user action into six unbounded requests.
 */
export function callOptions(): { abortSignal: AbortSignal; maxRetries: number } {
  return { abortSignal: AbortSignal.timeout(callTimeoutMs()), maxRetries: 1 };
}

/**
 * True when a call was cut short by our own deadline rather than refused by the
 * server. `AbortSignal.timeout` raises a `TimeoutError`, which the SDK wraps, so
 * the whole `cause` chain is walked — bounded, because a wrapper is free to
 * build a cycle.
 */
export function isTimeout(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 8; depth++) {
    const { name } = current as { name?: unknown };
    if (name === "TimeoutError" || name === "AbortError") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** What the user is told when the deadline is what stopped the call. */
export function timeoutMessage(): string {
  const seconds = Math.round(callTimeoutMs() / 1000);
  return `The AI server did not answer within ${seconds}s. It may be overloaded, or the request may be too large — try again, select a smaller passage, or lower the token budget in Settings → AI model.`;
}

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

/** Auto-detected model id, cached per base URL. */
const detectedModel = new Map<string, string>();

/** Drop the auto-detection cache (called when settings change). */
export function clearDetectedModels(): void {
  detectedModel.clear();
}

async function resolveModelId(baseUrl: string, apiKey: string): Promise<string> {
  const cached = detectedModel.get(baseUrl);
  if (cached) return cached;
  let models: ModelInfo[];
  try {
    models = await listModels(baseUrl, apiKey);
  } catch (err) {
    // No /models endpoint (e.g. cline.bot, many proxies): auto-detect is
    // impossible, so tell the user to pin a model id rather than leaking the
    // raw "404 on /models".
    if (err instanceof ModelsEndpointError) {
      throw new Error(
        `This LLM server has no model list (/models → ${err.status}), so no model could be auto-detected. Open Settings, enter a Model id, and Save.`,
      );
    }
    throw err;
  }
  const id = models[0]?.id;
  if (!id) throw new Error("No model loaded on the LLM server");
  detectedModel.set(baseUrl, id);
  return id;
}

/**
 * Some OpenAI-compatible proxies (e.g. cline.bot) wrap the chat-completion
 * body in a top-level "data" field instead of returning it directly, which
 * fails the SDK's response schema (no top-level "choices"). Transparently
 * unwrap that envelope so those proxies work like a standard server.
 */
async function unwrapDataEnvelope(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const res = await fetch(input, init);
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
    return res;
  }

  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(text, { status: res.status, headers: res.headers });
  }

  const { choices, data } = body as { choices?: unknown; data?: { choices?: unknown } };
  const unwrapped = choices === undefined && data?.choices !== undefined ? data : body;
  return new Response(JSON.stringify(unwrapped), {
    status: res.status,
    headers: res.headers,
  });
}

export async function languageModel(): Promise<LanguageModel> {
  const { baseUrl, model, apiKey } = await getAiSettings();
  const provider = createOpenAICompatible({
    name: "docyfier-llm",
    baseURL: baseUrl,
    apiKey: apiKey || "lm-studio",
    fetch: unwrapDataEnvelope,
  });
  const modelId = model || (await resolveModelId(baseUrl, apiKey));
  return provider(modelId);
}
