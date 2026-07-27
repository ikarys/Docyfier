import type { SecretOptionIds } from "@/domain/publishing/export-configuration";
import { EXPORT_TARGETS } from "./registry";

/**
 * Which options hold a credential, per target — the registry's answer. The
 * settings module deliberately does not import the targets it configures, so
 * whoever configures them passes this in.
 */
export function secretOptionIds(): SecretOptionIds {
  const ids: SecretOptionIds = {};
  for (const target of EXPORT_TARGETS) {
    const secrets = (target.options ?? [])
      .filter((option) => option.type === "secret")
      .map((option) => option.id);
    if (secrets.length) ids[target.id] = secrets;
  }
  return ids;
}
