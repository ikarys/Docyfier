import type { SecretOptionIds } from "@/domain/publishing/export-configuration";
import {
  secretOptionsOf,
  toTargetInfo,
  type ExportTarget,
  type ExportTargetInfo,
} from "@/domain/publishing/export-target";
import { confluenceTarget } from "@/infrastructure/publishing/targets/confluence";
import { docxTarget } from "@/infrastructure/publishing/targets/docx/docx-target";
import { notionTarget } from "@/infrastructure/publishing/targets/notion";
import { triliumTarget } from "@/infrastructure/publishing/targets/trilium";

/**
 * The export targets this build ships. The one place that knows the full list:
 * settings, the export pages and the download route all read it from here, so
 * a new target is one import away from being offered everywhere.
 */
export const EXPORT_TARGETS: ExportTarget[] = [
  docxTarget,
  confluenceTarget,
  notionTarget,
  triliumTarget,
];

export function findExportTarget(id: string): ExportTarget | undefined {
  return EXPORT_TARGETS.find((target) => target.id === id);
}

/** The registry as plain data, safe to hand to a client component. */
export function exportTargetInfos(): ExportTargetInfo[] {
  return EXPORT_TARGETS.map(toTargetInfo);
}

/**
 * Which options hold a credential, per target — the registry's answer. The
 * settings module deliberately does not import the targets it configures, so
 * whoever configures them passes this in.
 */
export function secretOptionIds(): SecretOptionIds {
  const ids: SecretOptionIds = {};
  for (const target of EXPORT_TARGETS) {
    const secrets = secretOptionsOf(target);
    if (secrets.length) ids[target.id] = secrets;
  }
  return ids;
}
