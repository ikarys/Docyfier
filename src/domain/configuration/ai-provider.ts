/**
 * One configured LLM endpoint.
 *
 * Several are saved side by side so switching — a different capability, a quota
 * that ran out — is one click rather than a retyped configuration. The rules
 * about what makes an endpoint usable live here: a settings page, a server
 * action and a file adapter all get the same answer, and none of them has to
 * know it.
 *
 * Instances are immutable, and the API key never leaves through `toSummary`.
 */

/** Rejected input, when a user is entering a provider and can be told why. */
export class InvalidProvider extends Error {
  constructor(
    readonly field: "baseUrl" | "maxOutputTokens" | "reasoningEffort",
    message: string,
  ) {
    super(message);
    this.name = "InvalidProvider";
  }
}

/**
 * A key is stored that this instance cannot decrypt any more. Raised when the
 * provider is about to be *used*, not when it is listed: the settings page has
 * to stay reachable, since re-entering the key is the only way out.
 */
export class UnreadableProviderKey extends Error {
  constructor(readonly id: string) {
    super(`The stored API key of provider ${id} cannot be read.`);
    this.name = "UnreadableProviderKey";
  }
}

/**
 * How much the model may deliberate before it writes.
 *
 * "default" sends nothing and leaves the model to its own habit — which is the
 * behaviour every provider had before this existed. The rest are the values the
 * OpenAI-compatible wire understands; a server that ignores the field answers
 * exactly as it did before, so choosing one can never break a working provider.
 */
export const REASONING_EFFORTS = ["default", "minimal", "low", "medium", "high"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

function isReasoningEffort(value: unknown): value is ReasoningEffort {
  return REASONING_EFFORTS.includes(value as ReasoningEffort);
}

/** The persisted shape — what a settings repository reads and writes. */
export interface AiProviderRecord {
  id: string;
  label: string;
  baseUrl: string;
  /** Model id; empty means "auto-detect the first model the server offers". */
  model: string;
  apiKey: string;
  maxOutputTokens: number;
  structuredOutput: boolean;
  /** How hard the model should think before answering; see `ReasoningEffort`.
   * Optional: a settings file written before this existed is still a record. */
  reasoningEffort?: ReasoningEffort;
}

/** What the browser is allowed to see: whether a key exists, never the key. */
export type AiProviderSummary = Omit<AiProviderRecord, "apiKey"> & {
  hasApiKey: boolean;
  /** A key is stored but this instance can no longer read it — the encryption
   * key rotated. The only way out is entering the key again. */
  keyUnreadable: boolean;
};

function requireBaseUrl(value: string): string {
  const baseUrl = value.trim();
  // `new URL` alone accepts "localhost:1234" — it reads "localhost:" as the
  // scheme — which then fails much later as an unreachable endpoint.
  const protocol = (() => {
    try {
      return new URL(baseUrl).protocol;
    } catch {
      return "";
    }
  })();
  if (protocol !== "http:" && protocol !== "https:") {
    throw new InvalidProvider(
      "baseUrl",
      "Base URL must be a full http(s) URL, e.g. http://localhost:1234/v1",
    );
  }
  return baseUrl;
}

/** A provider the user never labelled is named after its host. */
function hostOf(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return "";
  }
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0;
}

/**
 * Below this, a response cannot hold a formatted document — the whole point of
 * the product — so a typo in the field is refused rather than turned into
 * truncated output nobody can explain.
 */
const MIN_OUTPUT_TOKENS = 256;

export class AiProvider {
  private constructor(
    readonly id: string,
    readonly label: string,
    readonly baseUrl: string,
    readonly model: string,
    readonly apiKey: string,
    readonly maxOutputTokens: number,
    readonly structuredOutput: boolean,
    readonly reasoningEffort: ReasoningEffort = "default",
    /** True when a key is stored that could not be read back. */
    readonly keyUnreadable = false,
  ) {}

  /** A provider as a user just entered it. Invalid input is refused, not fixed. */
  static create(input: AiProviderRecord): AiProvider {
    const baseUrl = requireBaseUrl(input.baseUrl);
    if (
      !isPositiveInteger(input.maxOutputTokens) ||
      input.maxOutputTokens < MIN_OUTPUT_TOKENS
    ) {
      throw new InvalidProvider(
        "maxOutputTokens",
        `Max output tokens must be a whole number of at least ${MIN_OUTPUT_TOKENS}.`,
      );
    }
    const reasoningEffort = input.reasoningEffort ?? "default";
    if (!isReasoningEffort(reasoningEffort)) {
      throw new InvalidProvider(
        "reasoningEffort",
        `Reasoning effort must be one of ${REASONING_EFFORTS.join(", ")}.`,
      );
    }
    return new AiProvider(
      input.id,
      input.label.trim() || hostOf(baseUrl),
      baseUrl,
      input.model.trim(),
      input.apiKey,
      input.maxOutputTokens,
      input.structuredOutput,
      reasoningEffort,
    );
  }

  /**
   * A provider as it was stored. Nothing validated that file — an older layout,
   * a hand edit — so every unusable field falls back to `fallback` rather than
   * throwing: refusing to load would lock the user out of the page that fixes it.
   *
   * The fallback carries the environment's own credentials, which is why only
   * the provider it describes (same id) may inherit its key.
   *
   * A `null` key means "stored, but this instance cannot read it": the catalog
   * still loads — the settings page is where that gets fixed — and the provider
   * carries the fact instead of pretending it never had a key.
   */
  static restore(
    stored: Partial<Omit<AiProviderRecord, "apiKey">> & {
      id: string;
      apiKey?: string | null;
    },
    fallback: AiProviderRecord,
  ): AiProvider {
    const baseUrl = stored.baseUrl?.trim() || fallback.baseUrl;
    const usable = (() => {
      try {
        return requireBaseUrl(baseUrl);
      } catch {
        return requireBaseUrl(fallback.baseUrl);
      }
    })();
    return new AiProvider(
      stored.id,
      stored.label?.trim() || hostOf(usable),
      usable,
      stored.model?.trim() ?? fallback.model,
      stored.apiKey === null
        ? ""
        : stored.apiKey || (stored.id === fallback.id ? fallback.apiKey : ""),
      isPositiveInteger(stored.maxOutputTokens)
        ? stored.maxOutputTokens
        : fallback.maxOutputTokens,
      stored.structuredOutput ?? fallback.structuredOutput,
      isReasoningEffort(stored.reasoningEffort)
        ? stored.reasoningEffort
        : (fallback.reasoningEffort ?? "default"),
      stored.apiKey === null,
    );
  }

  /** The same provider under another key — or under none. */
  withKey(apiKey: string): AiProvider {
    return new AiProvider(
      this.id,
      this.label,
      this.baseUrl,
      this.model,
      apiKey,
      this.maxOutputTokens,
      this.structuredOutput,
      this.reasoningEffort,
    );
  }

  /** The same provider under an id it did not have before it was first saved. */
  withId(id: string): AiProvider {
    return new AiProvider(
      id,
      this.label,
      this.baseUrl,
      this.model,
      this.apiKey,
      this.maxOutputTokens,
      this.structuredOutput,
      this.reasoningEffort,
    );
  }

  toRecord(): AiProviderRecord {
    return {
      id: this.id,
      label: this.label,
      baseUrl: this.baseUrl,
      model: this.model,
      apiKey: this.apiKey,
      maxOutputTokens: this.maxOutputTokens,
      structuredOutput: this.structuredOutput,
      reasoningEffort: this.reasoningEffort,
    };
  }

  toSummary(): AiProviderSummary {
    const { apiKey, ...rest } = this.toRecord();
    return {
      ...rest,
      hasApiKey: apiKey.length > 0,
      keyUnreadable: this.keyUnreadable,
    };
  }
}
