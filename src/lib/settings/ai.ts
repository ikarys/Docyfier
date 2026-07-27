import "server-only";
import type { AiProviderDeps } from "@/application/configuration/deps";
import {
  activateProvider,
  activeProvider,
  deleteProvider,
  listProviders,
  providerKey,
  saveProvider,
  type ProviderInput,
} from "@/application/configuration/manage-ai-providers";
import type {
  AiProviderRecord,
  AiProviderSummary,
} from "@/domain/configuration/ai-provider";
import { aesGcmCipher } from "@/infrastructure/configuration/aes-gcm-cipher";
import { FileProviderRepository } from "@/infrastructure/configuration/file-provider-repository";
import { uuidIds } from "@/infrastructure/shared/system-clock";

/**
 * Composition root for the AI providers.
 *
 * The use cases (`src/application/configuration/`) take their repository and id
 * source as arguments; this is the one module that decides what those are in a
 * running app — the settings file, encrypted with the instance key, real UUIDs.
 * Server actions and pages call these functions and never see an adapter.
 */

export type { AiProviderSummary, ProviderInput };
/** What an AI call is built from: one endpoint, key included. */
export type AiSettings = AiProviderRecord;

function deps(): AiProviderDeps {
  return { providers: new FileProviderRepository(aesGcmCipher), ids: uuidIds };
}

/** The providers, for the switcher and the settings list. Never carries a key. */
export async function listAiProviders(): Promise<{
  providers: AiProviderSummary[];
  activeId: string;
}> {
  return listProviders(deps());
}

/** The provider AI calls run against, key in clear. Server-side only. */
export async function getAiSettings(): Promise<AiSettings> {
  return activeProvider(deps());
}

/** The stored key of one provider, for a server-side connection test. */
export async function getAiProviderKey(id: string): Promise<string> {
  return providerKey(deps(), id);
}

/** Create (empty id) or update a provider. An absent `apiKey` keeps the stored one. */
export async function saveAiProvider(input: ProviderInput): Promise<AiProviderSummary> {
  return saveProvider(deps(), input);
}

export async function deleteAiProvider(id: string): Promise<void> {
  return deleteProvider(deps(), id);
}

export async function setActiveAiProvider(id: string): Promise<void> {
  return activateProvider(deps(), id);
}
