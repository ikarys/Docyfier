import {
  AiProvider,
  UnreadableProviderKey,
  type AiProviderRecord,
  type AiProviderSummary,
} from "@/domain/configuration/ai-provider";
import type { AiProviderDeps } from "./deps";

/**
 * Configuring the endpoints the AI features call.
 *
 * What makes a provider valid, and what keeps a catalog usable, is decided by
 * the domain; these use cases only sequence load → decide → save, and they draw
 * one line the rest of the app depends on: **an API key leaves here only
 * through `activeProvider` and `providerKey`**, both server-side, never in a
 * summary a page could hand to the browser.
 */

/** What a provider form submits. An absent `apiKey` means "keep the stored one":
 * the browser never received it, so it cannot resend it unchanged. */
export interface ProviderInput extends Omit<AiProviderRecord, "apiKey"> {
  apiKey: string | undefined;
}

export async function listProviders(deps: AiProviderDeps): Promise<{
  providers: AiProviderSummary[];
  activeId: string;
}> {
  const catalog = await deps.providers.load();
  return { providers: catalog.summaries, activeId: catalog.activeProviderId };
}

/**
 * The provider AI calls run against, key included. Server-side only.
 *
 * A key that cannot be read stops the call here rather than turning into an
 * anonymous request the provider answers with an opaque 401.
 */
export async function activeProvider(deps: AiProviderDeps): Promise<AiProviderRecord> {
  const active = (await deps.providers.load()).active;
  if (active.keyUnreadable) throw new UnreadableProviderKey(active.id);
  return active.toRecord();
}

/** The stored key of one provider — for a connection test the browser cannot
 * carry a key for. Unknown ids answer with no key rather than an error: a test
 * against an unsaved form is a normal, anonymous call. */
export async function providerKey(deps: AiProviderDeps, id: string): Promise<string> {
  return (await deps.providers.load()).find(id)?.apiKey ?? "";
}

/** Create (empty id) or update a provider. The summary is what the caller may
 * show; the generated id is on it, which a creation needs. */
export async function saveProvider(
  deps: AiProviderDeps,
  input: ProviderInput,
): Promise<AiProviderSummary> {
  const catalog = await deps.providers.load();
  const id = input.id.trim() || deps.ids.next();
  const stored = catalog.find(id);
  const provider = AiProvider.create({
    ...input,
    id,
    apiKey: input.apiKey ?? stored?.apiKey ?? "",
  });
  await deps.providers.save(catalog.save(provider));
  return provider.toSummary();
}

export async function deleteProvider(deps: AiProviderDeps, id: string): Promise<void> {
  const catalog = await deps.providers.load();
  await deps.providers.save(catalog.remove(id));
}

export async function activateProvider(deps: AiProviderDeps, id: string): Promise<void> {
  const catalog = await deps.providers.load();
  await deps.providers.save(catalog.activate(id));
}
