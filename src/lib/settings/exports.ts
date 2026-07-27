import "server-only";
import {
  exportSettings,
  exportSummary,
  saveExportSettings as persistExportSettings,
  type ExportDeps,
} from "@/application/publishing/manage-exports";
import type {
  ExportSettings,
  ExportSettingsSummary,
  SecretOptionIds,
} from "@/domain/publishing/export-configuration";
import { aesGcmCipher } from "@/infrastructure/configuration/aes-gcm-cipher";
import { FileExportRepository } from "@/infrastructure/configuration/file-export-repository";

/**
 * Composition root for the export targets. Which options hold a credential is
 * the registry's answer, passed in by the caller: this module deliberately does
 * not import the targets it configures.
 */

export type { ExportSettings, ExportSettingsSummary };

function deps(): ExportDeps {
  return { configuration: new FileExportRepository(aesGcmCipher) };
}

/** Everything an export needs, credentials included. Server-side only. */
export async function getExportSettings(): Promise<ExportSettings> {
  return exportSettings(deps());
}

/** The same settings for the settings page: credentials are replaced by the
 * fact that they exist. */
export async function getExportSummary(
  secretIds: SecretOptionIds = {},
): Promise<ExportSettingsSummary> {
  return exportSummary(deps(), secretIds);
}

export async function saveExportSettings(
  settings: ExportSettings,
  secretIds: SecretOptionIds = {},
): Promise<void> {
  return persistExportSettings(deps(), settings, secretIds);
}
