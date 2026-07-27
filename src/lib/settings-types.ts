/**
 * The settings shapes a client component may import.
 *
 * The rules behind them live in `src/domain/configuration/`; this module only
 * re-exports what crosses to the browser, so a `"use client"` file never has to
 * reach into a layer it must not depend on.
 */
export type { AiProviderSummary } from "@/domain/configuration/ai-provider";
export {
  DEFAULT_PORTS,
  STORAGE_DRIVERS,
  isStorageDriver,
  type StorageDriver,
  type StorageConnectionRecord as StorageSettings,
  type StorageConnectionSummary as StorageSettingsSummary,
} from "@/domain/configuration/storage-connection";

/** State of one export target: off until the user turns it on, plus whatever
 * options that target declares. */
export interface ExportTargetSettings {
  enabled: boolean;
  options: Record<string, string>;
}

/** Export settings, keyed by target id. `publicBaseUrl` is shared: every
 * target that emits images needs the same absolute origin. */
export interface ExportSettings {
  targets: Record<string, ExportTargetSettings>;
  /** Absolute origin of this instance, e.g. https://docs.example.com. Empty
   * means images stay relative and only resolve from inside. */
  publicBaseUrl: string;
}

/** One target's settings as the browser sees them: values of options declared
 * `secret` are blanked, and `savedSecrets` lists the ones that hold a value. */
export interface ExportTargetSummary extends ExportTargetSettings {
  savedSecrets: string[];
}

export interface ExportSettingsSummary {
  targets: Record<string, ExportTargetSummary>;
  publicBaseUrl: string;
}
