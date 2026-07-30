import type { AiProviderRecord } from "@/domain/configuration/ai-provider";

/**
 * What the deployment says before anyone opened Settings.
 *
 * Resolution order across the configuration adapters is **file > environment >
 * default**, so these values describe a fresh instance and back the one
 * provider the environment can configure.
 */

/** The provider a pre-multi-provider file, and the environment, both describe. */
export const ENV_PROVIDER_ID = "default";

const DEFAULTS: AiProviderRecord = {
  id: ENV_PROVIDER_ID,
  label: "Default",
  baseUrl: "http://localhost:1234/v1",
  model: "",
  apiKey: "",
  maxOutputTokens: 32768,
  structuredOutput: false,
reasoningEffort: "default",
};

export function providerFromEnvironment(): AiProviderRecord {
  const maxTokens = Number(process.env.DOCYFIER_LLM_MAX_TOKENS);
  return {
    id: ENV_PROVIDER_ID,
    label: DEFAULTS.label,
    baseUrl: process.env.DOCYFIER_LLM_BASE_URL ?? DEFAULTS.baseUrl,
    model: process.env.DOCYFIER_LLM_MODEL ?? DEFAULTS.model,
    apiKey: process.env.DOCYFIER_LLM_API_KEY ?? DEFAULTS.apiKey,
    maxOutputTokens:
      Number.isInteger(maxTokens) && maxTokens > 0
        ? maxTokens
        : DEFAULTS.maxOutputTokens,
    structuredOutput:
      process.env.DOCYFIER_LLM_STRUCTURED === "1" || DEFAULTS.structuredOutput,
  };
}
