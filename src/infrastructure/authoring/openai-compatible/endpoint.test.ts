import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDetectedModels, languageModel } from "./endpoint";

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
