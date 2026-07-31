import "server-only";
import { randomUUID } from "node:crypto";

import { AiProvider, type AiProviderRecord } from "@/domain/configuration/ai-provider";
import { ProviderCatalog } from "@/domain/configuration/provider-catalog";
import type { AiProviderRepository } from "@/domain/configuration/provider-repository";
import type { SecretCipher } from "@/domain/configuration/secret-cipher";
import { ENV_PROVIDER_ID, providerFromEnvironment } from "./environment";
import { patchSettings, readSettings, type SettingsSections } from "./settings-file";

/**
 * The provider catalog in `settings.json`.
 *
 * Three things belong to this adapter and to nothing above it: the defaults an
 * unconfigured instance starts from, the migration of the pre-multi-provider
 * layout, and the encryption of the keys. Use cases see a catalog of usable
 * providers and never learn where any of it came from.
 */

type StoredProvider = Partial<Omit<AiProviderRecord, "apiKey">> & { apiKey?: unknown };

function storedProviders(saved: SettingsSections): StoredProvider[] {
  const providers = saved.ai?.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    return providers as StoredProvider[];
  }
  // Pre-multi-provider file (or none at all): the flat root keys are the one
  // provider, and it is the one the environment describes.
  return [
    {
      id: ENV_PROVIDER_ID,
      baseUrl: typeof saved.baseUrl === "string" ? saved.baseUrl : undefined,
      model: typeof saved.model === "string" ? saved.model : undefined,
      apiKey: saved.apiKey,
      maxOutputTokens:
        typeof saved.maxOutputTokens === "number" ? saved.maxOutputTokens : undefined,
    },
  ];
}

export class FileProviderRepository implements AiProviderRepository {
  constructor(private readonly cipher: SecretCipher) {}

  async load(): Promise<ProviderCatalog> {
    const saved = await readSettings();
    const fallback = providerFromEnvironment();
    const providers = await Promise.all(
      storedProviders(saved).map(async (stored) => {
        const id = typeof stored.id === "string" && stored.id.trim() ? stored.id : randomUUID();
        return AiProvider.restore(
          { ...stored, id, apiKey: await this.readKey(stored.apiKey) },
          fallback,
        );
      }),
    );
    const activeId = typeof saved.ai?.activeId === "string" ? saved.ai.activeId : undefined;
    return ProviderCatalog.of(providers, activeId);
  }

  /**
   * The key behind a stored value. A rotated encryption key gives `null` — the
   * provider then says its key is unreadable, rather than taking the whole
   * settings page down with it.
   */
  private async readKey(stored: unknown): Promise<string | null> {
    if (typeof stored !== "string" || !stored) return "";
    try {
      return await this.cipher.decrypt(stored);
    } catch {
      return null;
    }
  }

  async save(catalog: ProviderCatalog): Promise<void> {
    const providers = await Promise.all(
      catalog.list.map(async (provider) => ({
        ...provider.toRecord(),
        apiKey: await this.cipher.encrypt(provider.apiKey),
      })),
    );
    await patchSettings({
      ai: { providers, activeId: catalog.activeProviderId },
      // The pre-multi-provider fields are migrated by this very write.
      baseUrl: undefined,
      model: undefined,
      apiKey: undefined,
      maxOutputTokens: undefined,
    });
  }
}
