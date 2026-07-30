import { AiProvider, type AiProviderRecord } from "@/domain/configuration/ai-provider";
import { ProviderCatalog } from "@/domain/configuration/provider-catalog";
import type { AiProviderRepository } from "@/domain/configuration/provider-repository";

/**
 * The provider catalog held in memory — the implementation a test drives, and
 * the proof that the port is a real abstraction rather than a description of
 * the settings file.
 *
 * Like the file adapter, it starts from a default provider: an instance always
 * has an endpoint configured, even before anyone opened Settings.
 */

export const DEFAULT_PROVIDER: AiProviderRecord = {
  id: "default",
  label: "Default",
  baseUrl: "http://localhost:1234/v1",
  model: "",
  apiKey: "",
  maxOutputTokens: 32768,
  structuredOutput: false,
reasoningEffort: "default",
};

export class InMemoryProviderRepository implements AiProviderRepository {
  private catalog: ProviderCatalog;

  constructor(providers: AiProviderRecord[] = [DEFAULT_PROVIDER], activeId?: string) {
    this.catalog = ProviderCatalog.of(providers.map(AiProvider.create), activeId);
  }

  async load(): Promise<ProviderCatalog> {
    return this.catalog;
  }

  async save(catalog: ProviderCatalog): Promise<void> {
    this.catalog = catalog;
  }
}
