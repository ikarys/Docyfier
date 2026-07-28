import type {
  ExportSettings,
  ExportSettingsSummary,
  SecretOptionIds,
} from "@/domain/publishing/export-configuration";
import type { ExportConfigurationDeps } from "./deps";

/**
 * Configuring the export targets. Thin on purpose: what a target declares is
 * the target's business, and what may cross to the browser is the
 * configuration's — this only sequences load → decide → save.
 */

/** Everything an export needs, credentials included. Server-side only. */
export async function exportSettings(
  deps: ExportConfigurationDeps,
): Promise<ExportSettings> {
  return (await deps.configuration.load()).toSettings();
}

/** The same settings for the settings page: no credential crosses over. */
export async function exportSummary(
  deps: ExportConfigurationDeps,
  secretIds: SecretOptionIds,
): Promise<ExportSettingsSummary> {
  return (await deps.configuration.load()).toSummary(secretIds);
}

export async function saveExportSettings(
  deps: ExportConfigurationDeps,
  settings: ExportSettings,
  secretIds: SecretOptionIds,
): Promise<void> {
  const current = await deps.configuration.load();
  await deps.configuration.save(current.with(settings, secretIds), secretIds);
}
