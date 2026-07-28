import "server-only";
import type { SecretCipher } from "@/domain/configuration/secret-cipher";
import {
  ExportConfiguration,
  type SecretOptionIds,
} from "@/domain/publishing/export-configuration";
import type { ExportConfigurationRepository } from "@/domain/publishing/export-repository";
import { patchSettings, readSettings } from "./settings-file";

/**
 * The export configuration in `settings.json`. The environment's own list of
 * enabled targets and the encryption of the credential options both live here.
 */

/** Targets enabled out of the box, e.g. `DOCYFIER_EXPORTS=confluence,notion`,
 * so a deployment can ship them without a first visit to Settings. */
function alwaysEnabled(): string[] {
  return (process.env.DOCYFIER_EXPORTS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export class FileExportRepository implements ExportConfigurationRepository {
  constructor(private readonly cipher: SecretCipher) {}

  async load(): Promise<ExportConfiguration> {
    const saved = ((await readSettings()).exports ?? {}) as {
      targets?: unknown;
      publicBaseUrl?: string;
    };
    const targets = await this.decryptOptions(saved.targets);
    return ExportConfiguration.restore(
      targets,
      saved.publicBaseUrl?.trim() || (process.env.DOCYFIER_PUBLIC_URL ?? ""),
      alwaysEnabled(),
    );
  }

  /** Whether a stored value is a credential says so itself, through its prefix:
   * a file written before an option became secret still reads. */
  private async decryptOptions(raw: unknown): Promise<unknown> {
    const source = (raw ?? {}) as Record<
      string,
      { enabled?: unknown; options?: Record<string, unknown> }
    >;
    const targets: Record<string, unknown> = {};
    for (const [id, target] of Object.entries(source)) {
      const options: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(target?.options ?? {})) {
        options[key] =
          typeof value === "string" && this.cipher.isEncrypted(value)
            ? await this.cipher.decrypt(value)
            : value;
      }
      targets[id] = { enabled: target?.enabled, options };
    }
    return targets;
  }

  async save(
    configuration: ExportConfiguration,
    secretIds: SecretOptionIds,
  ): Promise<void> {
    const { targets, publicBaseUrl } = configuration.toSettings();
    const stored: Record<string, { enabled: boolean; options: Record<string, string> }> =
      {};
    for (const [id, target] of Object.entries(targets)) {
      const options: Record<string, string> = {};
      for (const [key, value] of Object.entries(target.options)) {
        options[key] =
          value && secretIds[id]?.includes(key)
            ? await this.cipher.encrypt(value)
            : value;
      }
      stored[id] = { enabled: target.enabled, options };
    }
    await patchSettings({ exports: { targets: stored, publicBaseUrl } });
  }
}
