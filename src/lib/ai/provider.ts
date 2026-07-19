import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * LLM provider abstraction (PLAN.md STEP 0/2). Currently targets a local
 * LM Studio instance through its OpenAI-compatible API; swapping providers
 * later (BYO LLM, STEP 7) only touches this file.
 */

export function llmBaseUrl(): string {
  return process.env.DOCYFIER_LLM_BASE_URL ?? "http://localhost:1234/v1";
}

const provider = () =>
  createOpenAICompatible({
    name: "lmstudio",
    baseURL: llmBaseUrl(),
    apiKey: process.env.DOCYFIER_LLM_API_KEY ?? "lm-studio",
  });

let cachedModelId: string | null = null;

/** Model id from env, else the first model the server exposes (cached). */
async function resolveModelId(): Promise<string> {
  const fromEnv = process.env.DOCYFIER_LLM_MODEL;
  if (fromEnv) return fromEnv;
  if (cachedModelId) return cachedModelId;

  const res = await fetch(`${llmBaseUrl()}/models`);
  if (!res.ok) {
    throw new Error(`LLM server responded ${res.status} on /models`);
  }
  const body = (await res.json()) as { data?: { id?: string }[] };
  const id = body.data?.[0]?.id;
  if (!id) {
    throw new Error("No model loaded on the LLM server");
  }
  cachedModelId = id;
  return id;
}

export async function languageModel(): Promise<LanguageModel> {
  return provider()(await resolveModelId());
}
