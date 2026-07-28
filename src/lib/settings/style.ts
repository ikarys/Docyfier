import "server-only";
import type { StyleDeps } from "@/application/authoring/deps";
import {
  saveStyle,
  styleParameters,
  styleRecord,
} from "@/application/authoring/manage-style";
import type {
  StyleParameters,
  StyleParametersRecord,
} from "@/domain/authoring/style-parameters";
import { FileStyleRepository } from "@/infrastructure/configuration/file-style-repository";

/**
 * Composition root for the writing style. The AI surfaces receive the
 * parameters as an argument; this is the one module that decides they are read
 * from the settings file.
 */

export type { StyleParametersRecord };

function deps(): StyleDeps {
  return { style: new FileStyleRepository() };
}

/** The parameters themselves, for the prompts and the deterministic pass. */
export async function getStyleParameters(): Promise<StyleParameters> {
  return styleParameters(deps());
}

/** The same parameters as plain data, for the settings page. */
export async function getStyleRecord(): Promise<StyleParametersRecord> {
  return styleRecord(deps());
}

export async function saveStyleParameters(
  input: unknown,
): Promise<StyleParametersRecord> {
  return saveStyle(deps(), input);
}
