import "server-only";
import { getExportSettings } from "@/lib/settings";
import type { DocumentRecord } from "@/domain/documents/document";
import { EXPORT_TARGETS, findExportTarget } from "./registry";
import {
  exportFilename,
  toTargetInfo,
  type ExportPayload,
  type ExportTargetInfo,
} from "./types";

/**
 * The one place that joins the target registry with what the user enabled.
 * Pages and the download route ask here instead of reading settings and the
 * registry side by side and disagreeing about which targets are live.
 */

export interface RenderedExport {
  target: ExportTargetInfo;
  filename: string;
  mime: string;
  payload: ExportPayload;
}

/** Targets the user turned on, in registry order. */
export async function enabledExportTargets(): Promise<ExportTargetInfo[]> {
  const settings = await getExportSettings();
  return EXPORT_TARGETS.filter((target) => settings.targets[target.id]?.enabled).map(
    toTargetInfo,
  );
}

/** One target, if it exists and the user enabled it. Lets a caller show the
 * target without paying for a render it would throw away. */
export async function availableExportTarget(
  targetId: string,
): Promise<ExportTargetInfo | null> {
  const target = findExportTarget(targetId);
  if (!target) return null;
  const settings = await getExportSettings();
  return settings.targets[target.id]?.enabled ? toTargetInfo(target) : null;
}

/** Render a document for one target, or `null` when the target is unknown or
 * disabled — a disabled target must not stay reachable by URL. */
export async function renderExport(
  doc: DocumentRecord,
  targetId: string,
): Promise<RenderedExport | null> {
  const target = findExportTarget(targetId);
  if (!target) return null;

  const settings = await getExportSettings();
  const state = settings.targets[target.id];
  if (!state?.enabled) return null;

  const values = { ...state.options, baseUrl: settings.publicBaseUrl };
  return {
    target: toTargetInfo(target),
    filename: exportFilename(doc.title, target.extension),
    mime: target.mime,
    payload: await target.render({ title: doc.title, content: doc.content }, values),
  };
}
