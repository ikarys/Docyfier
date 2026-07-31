import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDetectedModels,
  languageModel,
  PROVIDER_NAME,
  reasoningOptions,
  type ProviderEndpoint,
} from "./endpoint";

const ENDPOINT = { baseUrl: "http://llm.test/v1", apiKey: "", model: "" };

/** The SDK types a model as "an id or a client"; this adapter always builds a client. */
function modelIdOf(model: Awaited<ReturnType<typeof languageModel>>): string {
  return typeof model === "string" ? model : model.modelId;
}

function serverOffering(...ids: string[]): Response {
  return new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("choosing the model to call", () => {
  beforeEach(() => clearDetectedModels());
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the pinned model id and asks the server nothing", async () => {
    const fetched = vi.fn();
    vi.stubGlobal("fetch", fetched);

    const model = await languageModel({ ...ENDPOINT, model: "mistral-7b" });

    expect(modelIdOf(model)).toBe("mistral-7b");
    expect(fetched).not.toHaveBeenCalled();
  });

  it("takes the first model offered when none is pinned", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => serverOffering("first", "second")));

    const model = await languageModel(ENDPOINT);

    expect(modelIdOf(model)).toBe("first");
  });

  it("detects once per base URL, until the settings change", async () => {
    const fetched = vi.fn(async () => serverOffering("first"));
    vi.stubGlobal("fetch", fetched);

    await languageModel(ENDPOINT);
    await languageModel(ENDPOINT);
    expect(fetched).toHaveBeenCalledTimes(1);

    clearDetectedModels();
    await languageModel(ENDPOINT);
    expect(fetched).toHaveBeenCalledTimes(2);
  });

  it("tells the user to pin a model when the server has no model list", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));

    await expect(languageModel(ENDPOINT)).rejects.toThrow(/enter a Model id/);
  });

  it("refuses an empty server rather than calling a nameless model", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => serverOffering()));

    await expect(languageModel(ENDPOINT)).rejects.toThrow(/No model loaded/);
  });
});

describe("how hard the model may think", () => {
  const provider: ProviderEndpoint = {
    ...ENDPOINT,
    maxOutputTokens: 4096,
    structuredOutput: false,
  };

  /** Saying nothing and saying "default" are the same choice: leave the model
   * to its own habit, which is what every provider did before this existed. */
  it("sends nothing when no effort was chosen", () => {
    expect(reasoningOptions(provider)).toEqual({});
    expect(reasoningOptions({ ...provider, reasoningEffort: "default" })).toEqual({});
  });

  it("sends the effort under the name the SDK knows this provider by", () => {
    expect(reasoningOptions({ ...provider, reasoningEffort: "low" })).toEqual({
      providerOptions: { [PROVIDER_NAME]: { reasoning_effort: "low" } },
    });
  });

  it("lets a call ask for little thinking when the provider named no effort", () => {
    expect(reasoningOptions(provider, "low")).toEqual({
      providerOptions: { [PROVIDER_NAME]: { reasoning_effort: "low" } },
    });
  });

  /** The provider's setting is a person's choice; the call's is a guess about
   * one request. A guess never overrides a choice. */
  it("keeps the provider's own effort over what a call asked for", () => {
    expect(reasoningOptions({ ...provider, reasoningEffort: "high" }, "low")).toEqual({
      providerOptions: { [PROVIDER_NAME]: { reasoning_effort: "high" } },
    });
  });
});
