import {
  StyleParameters,
  type StyleParametersRecord,
} from "@/domain/authoring/style-parameters";
import type { StyleDeps } from "./deps";

/**
 * Configuring how this instance writes (PLAN.md STEP 9, need #15).
 *
 * The entity decides what a valid setting is; what is left here is loading it,
 * handing back a record a page can render, and storing what came back.
 */

export async function styleParameters(deps: StyleDeps): Promise<StyleParameters> {
  return deps.style.load();
}

export async function styleRecord(deps: StyleDeps): Promise<StyleParametersRecord> {
  return (await deps.style.load()).toRecord();
}

export async function saveStyle(
  deps: StyleDeps,
  input: unknown,
): Promise<StyleParametersRecord> {
  const style = StyleParameters.restore(input);
  await deps.style.save(style);
  return style.toRecord();
}
