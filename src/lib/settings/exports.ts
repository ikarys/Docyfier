import "server-only";
import {
  decryptSecret,
  encryptSecret,
  isEncrypted,
} from "@/infrastructure/configuration/aes-gcm-cipher";
import { patchSettings, readSettings } from "@/infrastructure/configuration/settings-file";
import type {
  ExportSettings,
  ExportSettingsSummary,
  ExportTargetSettings,
  ExportTargetSummary,
} from "@/lib/settings-types";

/** Which export targets are on, and the options each one declares. */

export type { ExportSettings, ExportSettingsSummary };

/** Targets enabled out of the box, e.g. `DOCYFIER_EXPORTS=confluence,notion`,
 * so a deployment can ship them without a first visit to Settings. */
function environmentDefaults(): string[] {
  return (process.env.DOCYFIER_EXPORTS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Drop anything the file holds for a target this build no longer ships, and
 * keep the values as strings — the shape comes from the target, not from here. */
function parseTargets(raw: unknown): Record<string, ExportTargetSettings> {
  const source = (raw ?? {}) as Record<string, Partial<ExportTargetSettings>>;
  const out: Record<string, ExportTargetSettings> = {};
  for (const [id, value] of Object.entries(source)) {
    const options = (value?.options ?? {}) as Record<string, unknown>;
    out[id] = {
      enabled: Boolean(value?.enabled),
      options: Object.fromEntries(
        Object.entries(options).map(([key, val]) => [key, String(val ?? "")]),
      ),
    };
  }
  return out;
}

async function savedExports(): Promise<Partial<ExportSettings>> {
  return ((await readSettings()).exports ?? {}) as Partial<ExportSettings>;
}

/** Everything an export needs, secret options decrypted. Which options are
 * secret is the target's business, not this module's: an encrypted value says
 * so itself through its prefix. */
export async function getExportSettings(): Promise<ExportSettings> {
  const saved = await savedExports();
  const targets = parseTargets(saved.targets);
  for (const id of environmentDefaults()) {
    targets[id] = { enabled: true, options: targets[id]?.options ?? {} };
  }
  for (const target of Object.values(targets)) {
    for (const [key, value] of Object.entries(target.options)) {
      if (isEncrypted(value)) target.options[key] = await decryptSecret(value);
    }
  }
  return {
    targets,
    publicBaseUrl:
      saved.publicBaseUrl?.trim() || (process.env.DOCYFIER_PUBLIC_URL ?? "").trim(),
  };
}

/** The same settings for the settings page: stored secrets are replaced by the
 * fact that they exist. */
export async function getExportSummary(): Promise<ExportSettingsSummary> {
  const stored = parseTargets((await savedExports()).targets);
  const { targets, publicBaseUrl } = await getExportSettings();

  const summary: Record<string, ExportTargetSummary> = {};
  for (const [id, target] of Object.entries(targets)) {
    const savedSecrets = Object.entries(stored[id]?.options ?? {})
      .filter(([, value]) => isEncrypted(value))
      .map(([key]) => key);
    summary[id] = {
      enabled: target.enabled,
      options: Object.fromEntries(
        Object.entries(target.options).map(([key, value]) => [
          key,
          savedSecrets.includes(key) ? "" : value,
        ]),
      ),
      savedSecrets,
    };
  }
  return { targets: summary, publicBaseUrl };
}

/**
 * Persist export settings. `secretOptions` names, per target, the options whose
 * value is a credential: those are encrypted, the rest stay readable — a
 * toggle or a page id gains nothing from being ciphertext. The caller passes
 * them from the target registry, which this module deliberately does not import.
 */
export async function saveExportSettings(
  exports: ExportSettings,
  secretOptions: Record<string, string[]> = {},
): Promise<void> {
  const targets: Record<string, ExportTargetSettings> = {};
  for (const [id, target] of Object.entries(exports.targets)) {
    const options: Record<string, string> = {};
    for (const [key, value] of Object.entries(target.options)) {
      options[key] =
        secretOptions[id]?.includes(key) && value && !isEncrypted(value)
          ? await encryptSecret(value)
          : value;
    }
    targets[id] = { enabled: target.enabled, options };
  }
  await patchSettings({ exports: { targets, publicBaseUrl: exports.publicBaseUrl } });
}
