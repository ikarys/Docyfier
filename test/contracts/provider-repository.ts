import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { AiProvider } from "@/domain/configuration/ai-provider";
import { ProviderCatalog } from "@/domain/configuration/provider-catalog";
import type { AiProviderRepository } from "@/domain/configuration/provider-repository";

/**
 * The `AiProviderRepository` contract, as one suite every adapter runs.
 *
 * The port promises that an unconfigured instance still has one provider to
 * call, that a saved catalog comes back as it went in — keys included, whatever
 * the storage does to them on the way — and that the active mark survives. The
 * use cases are written against those promises, so the file adapter and the
 * in-memory one have to keep them identically.
 */

export interface ProviderRepositoryHarness {
  repository: AiProviderRepository;
  /** Release whatever the adapter allocated (a directory, an env var). */
  dispose?(): Promise<void>;
}

const provider = (id: string, overrides: Partial<{ label: string; apiKey: string }> = {}) =>
  AiProvider.create({
    id,
    label: overrides.label ?? `Provider ${id}`,
    baseUrl: `https://api.example.com/${id}/v1`,
    model: "gpt-4o",
    apiKey: overrides.apiKey ?? "",
    maxOutputTokens: 4096,
reasoningEffort: "default",
  });

export function describeProviderRepository(
  name: string,
  open: () => Promise<ProviderRepositoryHarness>,
): void {
  describe(`${name} (AiProviderRepository contract)`, () => {
    let repository: AiProviderRepository;
    const opened: ProviderRepositoryHarness[] = [];

    beforeEach(async () => {
      const harness = await open();
      opened.push(harness);
      repository = harness.repository;
    });

    afterAll(async () => {
      await Promise.all(opened.map((harness) => harness.dispose?.()));
    });

    it("hands back a usable provider before anything was configured", async () => {
      const catalog = await repository.load();
      expect(catalog.list).toHaveLength(1);
      expect(catalog.active.baseUrl).toMatch(/^https?:\/\//);
    });

    it("gives back the catalog it was given", async () => {
      await repository.save(ProviderCatalog.of([provider("a"), provider("b")], "b"));

      const catalog = await repository.load();
      expect(catalog.list.map((p) => p.id)).toEqual(["a", "b"]);
      expect(catalog.activeProviderId).toBe("b");
      expect(catalog.list[0].label).toBe("Provider a");
    });

    it("keeps a key usable across a round trip, however it stores it", async () => {
      await repository.save(
        ProviderCatalog.of([provider("a", { apiKey: "sk-round-trip" })], "a"),
      );

      expect((await repository.load()).active.apiKey).toBe("sk-round-trip");
    });

    it("keeps a provider without a key without one", async () => {
      await repository.save(ProviderCatalog.of([provider("a")], "a"));

      const restored = (await repository.load()).active;
      expect(restored.apiKey).toBe("");
      expect(restored.keyUnreadable).toBe(false);
    });

    it("forgets a provider the catalog no longer holds", async () => {
      await repository.save(ProviderCatalog.of([provider("a"), provider("b")], "a"));
      await repository.save((await repository.load()).remove("b"));

      expect((await repository.load()).list.map((p) => p.id)).toEqual(["a"]);
    });
  });
}
