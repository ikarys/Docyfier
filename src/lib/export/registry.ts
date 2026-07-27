import { confluenceTarget } from "./targets/confluence";
import { notionTarget } from "./targets/notion";
import { triliumTarget } from "./targets/trilium";
import { toTargetInfo, type ExportTarget, type ExportTargetInfo } from "./types";

/**
 * The export targets this build ships. The one place that knows the full list:
 * settings, the export pages and the download route all read it from here, so
 * a new target is one import away from being offered everywhere.
 */
export const EXPORT_TARGETS: ExportTarget[] = [
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
