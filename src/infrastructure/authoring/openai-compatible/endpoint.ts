import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { listModels, ModelsEndpointError } from "./models";

/**
 * The SDK client over one OpenAI-compatible server (LM Studio by default).
 *
 * Which server that is comes in as an argument: this adapter never reads the
 * settings itself, so a caller can point it anywhere and a test can point it
 * nowhere.
 */

/** What building a model client needs. Empty `model` means "auto-detect". */
export interface ModelEndpoint {
  baseUrl: string;
  model: string;
  apiKey: string;
}

/** What one generation call needs on top of the endpoint itself. */
export interface ProviderEndpoint extends ModelEndpoint {
  maxOutputTokens: number;
  /** How hard the model may think first; absent or "default" sends nothing. */
  reasoningEffort?: string;
}

/**
 * The name the SDK knows this provider by. It is also the key provider-specific
 * options travel under, which is why it is declared once rather than typed
 * twice: a mismatch would silently drop every option.
 */
export const PROVIDER_NAME = "docyfier-llm";

/**
 * The key provider-specific options travel under — the camel-cased provider
 * name, which is the only form the adapter reads without deprecating it.
 */
export const PROVIDER_OPTIONS_KEY = "docyfierLlm";

/**
 * The reasoning setting, in the shape a call takes it.
 *
 * `reasoningEffort` is the adapter's own field name, and using it is not a
 * matter of taste: an option the adapter does not recognise is passed through
 * to the request body verbatim, and the body it builds then writes its own
 * `reasoning_effort` over the top — so the wire spelling arrives as `undefined`
 * and the model deliberates as if nothing had been asked. Sending nothing at
 * all stays a distinct choice: it leaves the model to whatever it does by
 * default.
 *
 * `asked` is what one request thinks it is worth: shortening a paragraph does
 * not deserve the thinking a whole document does, and on a reasoning model that
 * difference is most of the seconds the user waits. It only applies when the
 * provider named no effort of its own — a setting somebody chose outranks a
 * guess made per call.
 */
export function reasoningOptions(
  endpoint: ProviderEndpoint,
  asked?: string,
): { providerOptions?: Record<string, Record<string, string>> } {
  const chosen = endpoint.reasoningEffort;
  const effort = chosen && chosen !== "default" ? chosen : asked;
  if (!effort) return {};
  return { providerOptions: { [PROVIDER_OPTIONS_KEY]: { reasoningEffort: effort } } };
}

/** How the adapter obtains the provider in force at call time. */
export type LoadEndpoint = () => Promise<ProviderEndpoint>;

/** Auto-detected model id, cached per base URL. */
const detectedModel = new Map<string, string>();

/** Drop the auto-detection cache (called when settings change). */
export function clearDetectedModels(): void {
  detectedModel.clear();
}

async function resolveModelId(baseUrl: string, apiKey: string): Promise<string> {
  const cached = detectedModel.get(baseUrl);
  if (cached) return cached;
  let models: { id: string }[];
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

export async function languageModel(endpoint: ModelEndpoint): Promise<LanguageModel> {
  const { baseUrl, model, apiKey } = endpoint;
  const provider = createOpenAICompatible({
    name: PROVIDER_NAME,
    baseURL: baseUrl,
    apiKey: apiKey || "lm-studio",
    fetch: unwrapDataEnvelope,
  });
  const modelId = model || (await resolveModelId(baseUrl, apiKey));
  return provider(modelId);
}
