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

/** Auto-detected model id, cached per base URL. */
const detectedModel = new Map<string, string>();

/** Drop the auto-detection cache (called when settings change). */
export function clearDetectedModels(): void {
  detectedModel.clear();
}

async function resolveModelId(baseUrl: string, apiKey: string): Promise<string> {
  const cached = detectedModel.get(baseUrl);
  if (cached) return cached;
  const models = await listModels(baseUrl, apiKey);
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
