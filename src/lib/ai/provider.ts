import "server-only";
import type { LanguageModel } from "ai";
import {
  languageModel as modelFor,
  type ProviderEndpoint,
} from "@/infrastructure/authoring/openai-compatible/endpoint";
import { getAiSettings } from "@/lib/settings";

/**
 * Composition root for the LLM endpoint.
 *
 * The adapters under `src/infrastructure/authoring/openai-compatible/` take the
 * provider they must talk to as an argument; this is the one module that
 * decides what it is in a running app — the active provider from Settings.
 * Routes and actions call these and never build an SDK client themselves.
 */

export {
  clearDetectedModels,
  type ProviderEndpoint,
} from "@/infrastructure/authoring/openai-compatible/endpoint";
export {
  callOptions,
  callTimeoutMs,
  isTimeout,
  timeoutMessage,
} from "@/infrastructure/authoring/openai-compatible/deadline";
export {
  listModels,
  pingChatCompletion,
  ModelsEndpointError,
  type ModelInfo,
} from "@/infrastructure/authoring/openai-compatible/models";

/** The provider AI calls run against, key included. Server-side only. */
export function activeEndpoint(): Promise<ProviderEndpoint> {
  return getAiSettings();
}

/** A model client on the active provider. */
export async function languageModel(): Promise<LanguageModel> {
  return modelFor(await activeEndpoint());
}
