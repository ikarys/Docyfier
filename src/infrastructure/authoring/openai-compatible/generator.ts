import { APICallError, generateObject, generateText, jsonSchema } from "ai";
import type {
  GeneratedText,
  GenerationRequest,
  TextGenerator,
} from "@/domain/authoring/text-generator";
import { ModelUnavailable } from "@/domain/authoring/text-generator";
import { callOptions, callTimeoutMs, isTimeout, timeoutMessage } from "./deadline";
import { logUsage } from "./usage-log";
import {
  languageModel,
  reasoningOptions,
  type LoadEndpoint,
  type ProviderEndpoint,
} from "./endpoint";

/**
 * The `TextGenerator` adapter over any OpenAI-compatible endpoint.
 *
 * Everything the use cases must not know sits here: the SDK, the deadline, the
 * retry budget, and the wording a user reads when an endpoint is unreachable —
 * only this layer knows which endpoint that was. Which endpoint is in force is
 * handed in by the composition root, never read from settings here.
 */

/**
 * Deliberately permissive: it only pins the document envelope, which is what
 * models get wrong when they answer with a fence or a bare block. Node shapes
 * stay free — the editor schema is the real contract, and encoding it here
 * would be a second source of truth to keep in sync.
 */
const DOC_ENVELOPE = jsonSchema<{ type: string; content: unknown[] }>({
  type: "object",
  properties: {
    type: { type: "string", enum: ["doc"] },
    content: { type: "array", items: { type: "object" } },
  },
  required: ["type", "content"],
});

function unreachable(baseUrl: string, err: unknown): never {
  throw new ModelUnavailable(
    `Cannot reach the AI server at ${baseUrl}. Check Settings and make sure the server is running with a model loaded. (${String(err)})`,
  );
}

function looksUnreachable(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    /fetch failed|ECONNREFUSED|ENOTFOUND|timeout/i.test(String(err))
  );
}

function logFailure(err: unknown): void {
  if (APICallError.isInstance(err)) {
    // The provider's HTTP response didn't parse as the SDK's expected schema
    // (an HTML error page, an SSE chunk, a non-OpenAI envelope from a proxy) —
    // logging the raw body is the only way to see why.
    console.error(
      "[ai] APICallError from",
      err.url,
      "status",
      err.statusCode,
      "\nresponse body:",
      err.responseBody?.slice(0, 2000),
    );
    return;
  }
  console.error("[ai] generateText failed:", err);
}

export function createOpenAiCompatibleGenerator(
  loadEndpoint: LoadEndpoint,
): TextGenerator {
  return {
    async generate(request: GenerationRequest): Promise<GeneratedText> {
      const endpoint = await loadEndpoint();
      const started = Date.now();
      try {
        const { text, finishReason, usage } = await generateText({
          model: await languageModel(endpoint),
          system: request.system,
          prompt: request.prompt,
          temperature: request.temperature,
          maxOutputTokens: endpoint.maxOutputTokens,
          ...reasoningOptions(endpoint, request.effort),
          ...callOptions(),
        });
        logUsage("generate", started, usage);
        return { text, truncated: finishReason === "length" };
      } catch (err) {
        if (isTimeout(err)) {
          console.error("[ai] generateText timed out after", callTimeoutMs(), "ms");
          throw new ModelUnavailable(timeoutMessage());
        }
        logFailure(err);
        if (looksUnreachable(err)) unreachable(endpoint.baseUrl, err);
        throw err;
      }
    },

    /**
     * The provider's JSON mode, when the setting is on. Any failure there answers
     * `null` so the caller falls back to reading JSON out of text: turning the
     * option on can never make a working provider stop working.
     */
    async generateJson(request: GenerationRequest): Promise<unknown | null> {
      return structuredAnswer(await loadEndpoint(), request);
    },
  };
}

async function structuredAnswer(
  endpoint: ProviderEndpoint,
  request: GenerationRequest,
): Promise<unknown | null> {
  if (!endpoint.structuredOutput || request.shape !== "document") return null;
  const started = Date.now();
  try {
    const { object, usage } = await generateObject({
      model: await languageModel(endpoint),
      schema: DOC_ENVELOPE,
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxOutputTokens: endpoint.maxOutputTokens,
      ...reasoningOptions(endpoint, request.effort),
      ...callOptions(),
    });
    logUsage("generateObject", started, usage);
    return object;
  } catch (err) {
    // A deadline is not a reason to try the same endpoint again: falling
    // through would spend the timeout a second time before failing.
    if (isTimeout(err)) throw new ModelUnavailable(timeoutMessage());
    console.error("[ai] structured output failed, using the text path:", err);
    return null;
  }
}
