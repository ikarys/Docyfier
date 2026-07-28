/**
 * Which export targets are on, and what each one was configured with.
 *
 * A target declares its own options — this configuration stores them without
 * knowing what any of them mean. The one thing it does know is which of them
 * are credentials, because that decides what may cross to the browser and what
 * an empty field on save means.
 */

export class InvalidPublicUrl extends Error {
  constructor() {
    super("Public URL is not a valid URL.");
    this.name = "InvalidPublicUrl";
  }
}

/** State of one target: off until the user turns it on, plus its options. */
export interface ExportTargetSettings {
  enabled: boolean;
  options: Record<string, string>;
}

export interface ExportSettings {
  targets: Record<string, ExportTargetSettings>;
  /** Absolute origin of this instance, e.g. https://docs.example.com. Empty
   * means images stay relative and only resolve from inside. */
  publicBaseUrl: string;
}

/** One target as the browser sees it: credential values blanked, and the names
 * of the ones that hold a value. */
export interface ExportTargetSummary extends ExportTargetSettings {
  savedSecrets: string[];
}

export interface ExportSettingsSummary {
  targets: Record<string, ExportTargetSummary>;
  publicBaseUrl: string;
}

/** Per target, the ids of the options that are credentials — told by the target
 * registry at the boundary, since only a target knows what it declared. */
export type SecretOptionIds = Record<string, string[]>;

function readTargets(raw: unknown): Record<string, ExportTargetSettings> {
  const source = (raw ?? {}) as Record<string, Partial<ExportTargetSettings>>;
  const targets: Record<string, ExportTargetSettings> = {};
  for (const [id, value] of Object.entries(source)) {
    const options = (value?.options ?? {}) as Record<string, unknown>;
    targets[id] = {
      enabled: Boolean(value?.enabled),
      options: Object.fromEntries(
        Object.entries(options).map(([key, val]) => [key, String(val ?? "")]),
      ),
    };
  }
  return targets;
}

export class ExportConfiguration {
  private constructor(
    private readonly targets: Record<string, ExportTargetSettings>,
    readonly publicBaseUrl: string,
  ) {}

  /**
   * The configuration as it was stored. `alwaysEnabled` names the targets a
   * deployment turned on through the environment, so an instance can ship them
   * without a first visit to Settings.
   */
  static restore(
    stored: unknown,
    publicBaseUrl: string,
    alwaysEnabled: string[],
  ): ExportConfiguration {
    const targets = readTargets(stored);
    for (const id of alwaysEnabled) {
      targets[id] = { enabled: true, options: targets[id]?.options ?? {} };
    }
    return new ExportConfiguration(targets, publicBaseUrl.trim());
  }

  isEnabled(id: string): boolean {
    return this.targets[id]?.enabled ?? false;
  }

  optionsFor(id: string): Record<string, string> {
    return { ...(this.targets[id]?.options ?? {}) };
  }

  toSettings(): ExportSettings {
    return { targets: structuredClone(this.targets), publicBaseUrl: this.publicBaseUrl };
  }

  toSummary(secretIds: SecretOptionIds): ExportSettingsSummary {
    const targets: Record<string, ExportTargetSummary> = {};
    for (const [id, target] of Object.entries(this.targets)) {
      const secrets = secretIds[id] ?? [];
      targets[id] = {
        enabled: target.enabled,
        options: Object.fromEntries(
          Object.entries(target.options).map(([key, value]) => [
            key,
            secrets.includes(key) ? "" : value,
          ]),
        ),
        savedSecrets: secrets.filter((key) => Boolean(target.options[key])),
      };
    }
    return { targets, publicBaseUrl: this.publicBaseUrl };
  }

  /**
   * The configuration a form describes, over this one. A credential the browser
   * never received cannot be resent, so an absent one keeps what is stored and
   * only an explicit empty string clears it.
   */
  with(settings: ExportSettings, secretIds: SecretOptionIds): ExportConfiguration {
    const publicBaseUrl = settings.publicBaseUrl.trim();
    if (publicBaseUrl && !isAbsoluteUrl(publicBaseUrl)) throw new InvalidPublicUrl();

    const targets: Record<string, ExportTargetSettings> = {};
    for (const [id, target] of Object.entries(settings.targets)) {
      const options = { ...target.options };
      for (const key of secretIds[id] ?? []) {
        if (options[key] === undefined) {
          const stored = this.targets[id]?.options[key];
          if (stored) options[key] = stored;
        }
      }
      targets[id] = { enabled: target.enabled, options };
    }
    return new ExportConfiguration(targets, publicBaseUrl);
  }
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
