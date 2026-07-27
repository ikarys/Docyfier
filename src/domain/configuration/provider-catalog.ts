import type { AiProvider, AiProviderSummary } from "./ai-provider";

/**
 * Every configured provider, plus the one AI calls run against.
 *
 * The invariants are what keep the product usable: there is always an active
 * provider, and the last one cannot be deleted — an instance with no endpoint
 * could not even reach the settings page that would fix it.
 *
 * Immutable: every change returns a new catalog, so a caller cannot half-apply
 * a switch and a deletion.
 */

export class UnknownProvider extends Error {
  constructor(readonly id: string) {
    super(`No provider with id ${id}`);
    this.name = "UnknownProvider";
  }
}

export class LastProviderStays extends Error {
  constructor() {
    super("At least one provider must remain configured.");
    this.name = "LastProviderStays";
  }
}

export class ProviderCatalog {
  private constructor(
    private readonly providers: AiProvider[],
    private readonly activeId: string,
  ) {}

  /**
   * A catalog over providers already restored. An `activeId` naming a provider
   * that is no longer there falls back to the first: a stale settings file must
   * not decide that nothing is active.
   */
  static of(providers: AiProvider[], activeId: string | undefined): ProviderCatalog {
    if (providers.length === 0) {
      throw new LastProviderStays();
    }
    const active = providers.some((p) => p.id === activeId)
      ? (activeId as string)
      : providers[0].id;
    return new ProviderCatalog(providers, active);
  }

  get list(): readonly AiProvider[] {
    return this.providers;
  }

  get summaries(): AiProviderSummary[] {
    return this.providers.map((provider) => provider.toSummary());
  }

  get active(): AiProvider {
    return this.providers.find((p) => p.id === this.activeId) as AiProvider;
  }

  get activeProviderId(): string {
    return this.activeId;
  }

  find(id: string): AiProvider | null {
    return this.providers.find((p) => p.id === id) ?? null;
  }

  /** Insert or replace by id, keeping the order the user configured. */
  save(provider: AiProvider): ProviderCatalog {
    const index = this.providers.findIndex((p) => p.id === provider.id);
    const providers =
      index === -1
        ? [...this.providers, provider]
        : this.providers.map((p, i) => (i === index ? provider : p));
    return new ProviderCatalog(providers, this.activeId);
  }

  /** Remove by id. Removing the active provider moves the mark to the first left. */
  remove(id: string): ProviderCatalog {
    if (!this.providers.some((p) => p.id === id)) return this;
    if (this.providers.length <= 1) throw new LastProviderStays();
    const providers = this.providers.filter((p) => p.id !== id);
    return ProviderCatalog.of(
      providers,
      providers.some((p) => p.id === this.activeId) ? this.activeId : providers[0].id,
    );
  }

  activate(id: string): ProviderCatalog {
    if (!this.providers.some((p) => p.id === id)) throw new UnknownProvider(id);
    return new ProviderCatalog(this.providers, id);
  }
}
