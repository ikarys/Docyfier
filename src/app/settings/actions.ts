"use server";

import { revalidatePath } from "next/cache";
import { getAiSettings, saveAiSettings } from "@/lib/settings";
import {
  listModels,
  pingChatCompletion,
  clearDetectedModels,
  ModelsEndpointError,
  type ModelInfo,
} from "@/lib/ai/provider";

export type SaveSettingsState = { saved: boolean; error?: string } | null;

export type ListModelsResult =
  | { ok: true; models: ModelInfo[] }
  | { ok: false; error: string; status?: number };

export async function saveAiSettingsAction(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  if (!baseUrl) return { saved: false, error: "Base URL is required." };
  try {
    new URL(baseUrl);
  } catch {
    return { saved: false, error: "Base URL is not a valid URL." };
  }

  const maxOutputTokens = Number(formData.get("maxOutputTokens"));
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 256) {
    return {
      saved: false,
      error: "Max output tokens must be an integer ≥ 256.",
    };
  }

  await saveAiSettings({
    baseUrl,
    model: String(formData.get("model") ?? "").trim(),
    apiKey: String(formData.get("apiKey") ?? "").trim(),
    maxOutputTokens,
    structuredOutput: formData.get("structuredOutput") === "on",
  });
  clearDetectedModels();
  revalidatePath("/settings");
  return { saved: true };
}

/** Probe an OpenAI-compatible server and list its models ("test connection"). */
export async function listModelsAction(
  baseUrl: string,
  apiKey: string,
): Promise<ListModelsResult> {
  try {
    return { ok: true, models: await listModels(baseUrl.trim(), apiKey.trim()) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Connection failed",
      status: err instanceof ModelsEndpointError ? err.status : undefined,
    };
  }
}

export type TestChatResult = { ok: true } | { ok: false; error: string };

/** Validate a server + model via a minimal chat completion ("test connection"
 * for servers without a /models endpoint). */
export async function testChatAction(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<TestChatResult> {
  if (!model.trim()) {
    return { ok: false, error: "Enter a model id to test." };
  }
  try {
    await pingChatCompletion(baseUrl.trim(), apiKey.trim(), model.trim());
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Chat test failed",
    };
  }
}

export async function currentAiSettings() {
  return getAiSettings();
}
