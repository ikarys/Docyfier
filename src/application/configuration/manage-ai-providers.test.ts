import { beforeEach, describe, expect, it } from "vitest";
import { SequentialIds } from "@test/fakes/document-deps";
import {
  AiProvider,
  InvalidProvider,
  UnreadableProviderKey,
} from "@/domain/configuration/ai-provider";
import {
  LastProviderStays,
  ProviderCatalog,
  UnknownProvider,
} from "@/domain/configuration/provider-catalog";
import {
  DEFAULT_PROVIDER,
  InMemoryProviderRepository,
} from "@/infrastructure/configuration/in-memory-provider-repository";
import type { AiProviderDeps } from "./deps";
import {
  activateProvider,
  activeProvider,
  deleteProvider,
  listProviders,
  providerKey,
  saveProvider,
} from "./manage-ai-providers";

const entered = {
  label: "Hosted",
  baseUrl: "https://api.example.com/v1",
  model: "gpt-4o",
  maxOutputTokens: 8192,
  structuredOutput: true,
};

let deps: AiProviderDeps;
beforeEach(() => {
  deps = { providers: new InMemoryProviderRepository(), ids: new SequentialIds() };
});

describe("saveProvider", () => {
  it("gives a brand new provider an id, and leaves the active one alone", async () => {
    const saved = await saveProvider(deps, { id: "", apiKey: "sk-new", ...entered });

    expect(saved.id).toBe("doc-1");
    const { providers, activeId } = await listProviders(deps);
    expect(providers.map((p) => p.id)).toEqual([DEFAULT_PROVIDER.id, "doc-1"]);
    expect(activeId).toBe(DEFAULT_PROVIDER.id);
  });

  it("updates in place when the id is one it already holds", async () => {
    await saveProvider(deps, { id: DEFAULT_PROVIDER.id, apiKey: "", ...entered });

    const { providers } = await listProviders(deps);
    expect(providers).toHaveLength(1);
    expect(providers[0].label).toBe("Hosted");
  });

  it("keeps the stored key when the form leaves the field untouched", async () => {
    const created = await saveProvider(deps, { id: "", apiKey: "sk-kept", ...entered });
    await saveProvider(deps, { id: created.id, apiKey: undefined, ...entered });

    expect(await providerKey(deps, created.id)).toBe("sk-kept");
  });

  it("clears the key when the user explicitly empties the field", async () => {
    const created = await saveProvider(deps, { id: "", apiKey: "sk-old", ...entered });
    await saveProvider(deps, { id: created.id, apiKey: "", ...entered });

    expect(await providerKey(deps, created.id)).toBe("");
  });

  it("refuses input the domain calls invalid, and stores nothing", async () => {
    await expect(
      saveProvider(deps, { id: "", apiKey: "", ...entered, baseUrl: "nope" }),
    ).rejects.toThrow(InvalidProvider);

    const { providers } = await listProviders(deps);
    expect(providers).toHaveLength(1);
  });

  it("never hands a key back to its caller", async () => {
    const saved = await saveProvider(deps, { id: "", apiKey: "sk-secret", ...entered });
    expect(JSON.stringify(saved)).not.toContain("sk-secret");
    expect(saved.hasApiKey).toBe(true);
  });
});

describe("activateProvider", () => {
  it("switches the provider every AI call then runs against", async () => {
    const created = await saveProvider(deps, { id: "", apiKey: "", ...entered });
    await activateProvider(deps, created.id);

    expect((await activeProvider(deps)).baseUrl).toBe(entered.baseUrl);
    expect((await listProviders(deps)).activeId).toBe(created.id);
  });

  it("refuses an id it does not hold", async () => {
    await expect(activateProvider(deps, "ghost")).rejects.toThrow(UnknownProvider);
  });
});

describe("deleteProvider", () => {
  it("removes a provider and keeps something active", async () => {
    const created = await saveProvider(deps, { id: "", apiKey: "", ...entered });
    await activateProvider(deps, created.id);
    await deleteProvider(deps, created.id);

    const { providers, activeId } = await listProviders(deps);
    expect(providers.map((p) => p.id)).toEqual([DEFAULT_PROVIDER.id]);
    expect(activeId).toBe(DEFAULT_PROVIDER.id);
  });

  it("keeps the last one: the app always needs an endpoint", async () => {
    await expect(deleteProvider(deps, DEFAULT_PROVIDER.id)).rejects.toThrow(
      LastProviderStays,
    );
  });
});

describe("activeProvider", () => {
  it("carries the key, because this is what an AI call is built from", async () => {
    await saveProvider(deps, {
      id: DEFAULT_PROVIDER.id,
      apiKey: "sk-active",
      ...entered,
    });
    expect((await activeProvider(deps)).apiKey).toBe("sk-active");
  });
});

describe("an active provider whose key cannot be read", () => {
  it("stops the call instead of letting an anonymous request go out", async () => {
    const unreadable = AiProvider.restore(
      { id: DEFAULT_PROVIDER.id, apiKey: null },
      DEFAULT_PROVIDER,
    );
    const catalog = ProviderCatalog.of([unreadable], DEFAULT_PROVIDER.id);
    const deps: AiProviderDeps = {
      providers: { load: async () => catalog, save: async () => {} },
      ids: new SequentialIds(),
    };

    await expect(activeProvider(deps)).rejects.toThrow(UnreadableProviderKey);
    // The list still works: re-entering the key is the only way out of this.
    expect((await listProviders(deps)).providers[0].keyUnreadable).toBe(true);
  });
});

describe("providerKey", () => {
  it("is empty for an id nobody configured, so a test connection stays anonymous", async () => {
    expect(await providerKey(deps, "ghost")).toBe("");
  });
});
