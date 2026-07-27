"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import {
  deleteAiProvider,
  getAiProviderKey,
  listAiProviders,
  saveAiProvider,
  setActiveAiProvider,
} from "@/lib/settings";
import { toSummary, type AiProviderSummary } from "@/lib/settings-types";
import {
  listModels,
  pingChatCompletion,
  clearDetectedModels,
  ModelsEndpointError,
  type ModelInfo,
} from "@/lib/ai/provider";

export type SaveSettingsState =
  | { saved: boolean; error?: string; provider?: AiProviderSummary }
  | null;

export type ListModelsResult =
  | { ok: true; models: ModelInfo[] }
  | { ok: false; error: string; status?: number };

/** Create or update one provider. An empty API key field keeps the stored key —
 * the browser never receives it, so "unchanged" cannot mean "resubmitted". */
export async function saveAiProviderAction(
  _prev: SaveSettingsState,
  formData: FormData,
): Promise<SaveSettingsState> {
  await requireAuth();
  const id = String(formData.get("id") ?? "").trim();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { saved: false, error: "Name is required." };

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

  const typedKey = String(formData.get("apiKey") ?? "").trim();
  const cleared = formData.get("apiKeyCleared") === "1";
  const apiKey = typedKey || (cleared || !id ? "" : await getAiProviderKey(id));

  const saved = await saveAiProvider({
    id,
    label,
    baseUrl,
    model: String(formData.get("model") ?? "").trim(),
    apiKey,
    maxOutputTokens,
    structuredOutput: formData.get("structuredOutput") === "on",
  });
  clearDetectedModels();
  revalidatePath("/settings/ai");
  return { saved: true, provider: toSummary(saved) };
}

export type ProviderActionState = { ok: true } | { ok: false; error: string };

export async function deleteAiProviderAction(id: string): Promise<ProviderActionState> {
  await requireAuth();
  try {
    await deleteAiProvider(id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed" };
  }
  clearDetectedModels();
  revalidatePath("/settings/ai");
  return { ok: true };
}

/** Switch the provider every AI surface runs against. */
export async function setActiveAiProviderAction(
  id: string,
): Promise<ProviderActionState> {
  await requireAuth();
  try {
    await setActiveAiProvider(id);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Switch failed" };
  }
  clearDetectedModels();
  revalidatePath("/settings/ai");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** The key to test with: what the user just typed, or the stored one when the
 * field was left untouched. Resolved here so keys stay on the server. */
async function testKey(typed: string, providerId?: string): Promise<string> {
  const trimmed = typed.trim();
  if (trimmed) return trimmed;
  return providerId ? getAiProviderKey(providerId) : "";
}

/** Probe an OpenAI-compatible server and list its models ("test connection"). */
export async function listModelsAction(
  baseUrl: string,
  apiKey: string,
  providerId?: string,
): Promise<ListModelsResult> {
  await requireAuth();
  try {
    const key = await testKey(apiKey, providerId);
    return { ok: true, models: await listModels(baseUrl.trim(), key) };
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
  providerId?: string,
): Promise<TestChatResult> {
  await requireAuth();
  if (!model.trim()) {
    return { ok: false, error: "Enter a model id to test." };
  }
  try {
    const key = await testKey(apiKey, providerId);
    await pingChatCompletion(baseUrl.trim(), key, model.trim());
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Chat test failed",
    };
  }
}

export async function currentAiProviders() {
  await requireAuth();
  return listAiProviders();
}
