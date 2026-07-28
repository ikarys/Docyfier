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

export type {
  ExportSettings,
  ExportSettingsSummary,
  ExportTargetSettings,
  ExportTargetSummary,
} from "@/domain/publishing/export-configuration";
