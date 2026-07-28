import type { ExportConfiguration, SecretOptionIds } from "./export-configuration";

/**
 * Where the export configuration is kept — the port, not a backend.
 *
 * Saving takes the ids of the credential options because that is the only thing
 * an implementation needs to know about the values it stores: those are
 * encrypted, and everything else stays readable — a toggle or a page id gains
 * nothing from being ciphertext.
 */
export interface ExportConfigurationRepository {
  load(): Promise<ExportConfiguration>;
  save(configuration: ExportConfiguration, secretIds: SecretOptionIds): Promise<void>;
}
