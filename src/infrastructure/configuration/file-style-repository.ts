import "server-only";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import type { StyleParametersRepository } from "@/domain/authoring/style-repository";
import { patchSettings, readSettings } from "./settings-file";

/**
 * The instance's writing style in `settings.json`, beside the other scopes.
 * It steers prompts and the deterministic pass; nothing here is a credential.
 */
export class FileStyleRepository implements StyleParametersRepository {
  async load(): Promise<StyleParameters> {
    return StyleParameters.restore((await readSettings()).writing);
  }

  async save(style: StyleParameters): Promise<void> {
    await patchSettings({ writing: style.toRecord() });
  }
}
