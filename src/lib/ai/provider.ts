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
    throw new Error(`LLM server responded ${res.status} on /models`);
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

export async function languageModel(): Promise<LanguageModel> {
  const { baseUrl, model, apiKey } = await getAiSettings();
  const provider = createOpenAICompatible({
    name: "docyfier-llm",
    baseURL: baseUrl,
    apiKey: apiKey || "lm-studio",
  });
  const modelId = model || (await resolveModelId(baseUrl, apiKey));
  return provider(modelId);
}
