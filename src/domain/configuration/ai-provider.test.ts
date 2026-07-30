import { describe, expect, it } from "vitest";
import { AiProvider, InvalidProvider } from "./ai-provider";

const valid = {
  id: "p1",
  label: "LM Studio",
  baseUrl: "http://localhost:1234/v1",
  model: "qwen",
  apiKey: "sk-test",
  maxOutputTokens: 4096,
  structuredOutput: false,
};

/**
 * A provider is what every AI call is aimed at. The rules below are the reason
 * it is an entity and not a bag of strings: a saved endpoint that cannot be
 * reached, or a token ceiling of zero, is a broken instance, not a UI problem.
 */
describe("AiProvider.create", () => {
  it("keeps a well-formed endpoint as it was configured", () => {
    const provider = AiProvider.create(valid);
    expect(provider.baseUrl).toBe("http://localhost:1234/v1");
    expect(provider.label).toBe("LM Studio");
    expect(provider.model).toBe("qwen");
  });

  it("refuses a base URL that is not a URL", () => {
    expect(() => AiProvider.create({ ...valid, baseUrl: "localhost:1234" })).toThrow(
      InvalidProvider,
    );
    expect(() => AiProvider.create({ ...valid, baseUrl: "  " })).toThrow(InvalidProvider);
  });

  it("names an unlabelled provider after its host, so the switcher stays readable", () => {
    expect(AiProvider.create({ ...valid, label: "  " }).label).toBe("localhost:1234");
  });

  it("refuses a token ceiling too low to hold a formatted document", () => {
    expect(() => AiProvider.create({ ...valid, maxOutputTokens: 0 })).toThrow(
      InvalidProvider,
    );
    expect(() => AiProvider.create({ ...valid, maxOutputTokens: 255 })).toThrow(
      InvalidProvider,
    );
    expect(() => AiProvider.create({ ...valid, maxOutputTokens: 4096.5 })).toThrow(
      InvalidProvider,
    );
  });

  it("trims the model id, where empty means auto-detect", () => {
    expect(AiProvider.create({ ...valid, model: "  gpt-4o  " }).model).toBe("gpt-4o");
    expect(AiProvider.create({ ...valid, model: "   " }).model).toBe("");
  });
});

/**
 * `restore` reads a settings file nobody validated: an old layout, a hand edit,
 * a truncated write. It repairs instead of throwing — refusing to start because
 * one field is wrong would lock the user out of the page that fixes it.
 */
describe("AiProvider.restore", () => {
  it("falls back to the given defaults for anything unusable", () => {
    const provider = AiProvider.restore(
      { id: "p1", baseUrl: "nonsense", maxOutputTokens: -1 },
      { ...valid, id: "fallback", baseUrl: "http://fallback:1/v1", maxOutputTokens: 100 },
    );
    expect(provider.id).toBe("p1");
    expect(provider.baseUrl).toBe("http://fallback:1/v1");
    expect(provider.maxOutputTokens).toBe(100);
  });

  it("keeps its own id and its own key", () => {
    const provider = AiProvider.restore(
      { id: "p2", apiKey: "sk-own" },
      { ...valid, id: "fallback", apiKey: "sk-fallback" },
    );
    expect(provider.id).toBe("p2");
    expect(provider.apiKey).toBe("sk-own");
  });

  it("carries the fact that a stored key could not be read", () => {
    const provider = AiProvider.restore({ id: "default", apiKey: null }, valid);
    expect(provider.keyUnreadable).toBe(true);
    // Not even the environment's key stands in: the user has to re-enter theirs.
    expect(provider.apiKey).toBe("");
    expect(provider.toSummary().hasApiKey).toBe(false);
  });

  it("takes the fallback key only for the provider the environment describes", () => {
    const fallback = { ...valid, id: "default", apiKey: "sk-env" };
    expect(AiProvider.restore({ id: "default" }, fallback).apiKey).toBe("sk-env");
    expect(AiProvider.restore({ id: "other" }, fallback).apiKey).toBe("");
  });
});

describe("an existing provider", () => {
  it("hands back its stored key when a save leaves the field untouched", () => {
    const provider = AiProvider.create(valid);
    expect(provider.withKey("").apiKey).toBe("");
    expect(provider.withKey("sk-new").apiKey).toBe("sk-new");
  });

  it("never lets its key reach a summary, only whether one is set", () => {
    expect(AiProvider.create(valid).toSummary()).toEqual({
      id: "p1",
      label: "LM Studio",
      baseUrl: "http://localhost:1234/v1",
      model: "qwen",
      maxOutputTokens: 4096,
      structuredOutput: false,
      reasoningEffort: "default",
      hasApiKey: true,
      keyUnreadable: false,
    });
    expect(AiProvider.create({ ...valid, apiKey: "" }).toSummary().hasApiKey).toBe(false);
  });
});

describe("reasoning effort", () => {
  /** The setting that decides whether a model answers in four seconds or in
   * four minutes: a reasoning model left at its default deliberates over a
   * request to move a paragraph into a table. */
  it("defaults to whatever the model does on its own", () => {
    expect(AiProvider.create(valid).reasoningEffort).toBe("default");
  });

  it("keeps an effort the user chose", () => {
    expect(AiProvider.create({ ...valid, reasoningEffort: "low" }).reasoningEffort).toBe("low");
  });

  it("refuses an effort no provider would understand", () => {
    expect(() => AiProvider.create({ ...valid, reasoningEffort: "some" as never })).toThrow(
      InvalidProvider,
    );
  });

  it("falls back rather than failing to load a hand-edited file", () => {
    const restored = AiProvider.restore(
      { id: "p1", reasoningEffort: "enormous" as never },
      { ...valid, reasoningEffort: "medium" },
    );

    expect(restored.reasoningEffort).toBe("medium");
  });

  it("survives a file written before the setting existed", () => {
    expect(AiProvider.restore({ id: "p1" }, valid).reasoningEffort).toBe("default");
  });
});

