import { exportFilename } from "@/domain/publishing/export-filename";
import {
  toTargetInfo,
  type ExportDocument,
  type ExportPayload,
  type ExportTarget,
  type ExportTargetInfo,
} from "@/domain/publishing/export-target";
import type { ExportTargetDeps } from "./deps";

/**
 * The one place that joins the targets a build ships with the ones the user
 * turned on. A disabled target does not exist: the pages hide it, and every
 * route that could still be reached by URL refuses it here.
 */

export interface RenderedExport {
  target: ExportTargetInfo;
  filename: string;
  mime: string;
  payload: ExportPayload;
}

/** Targets the user turned on, in registry order. */
export async function enabledTargets(
  deps: ExportTargetDeps,
): Promise<ExportTargetInfo[]> {
  const configuration = await deps.configuration.load();
  return deps.targets
    .filter((target) => configuration.isEnabled(target.id))
    .map(toTargetInfo);
}

/** One target, if it exists and the user enabled it. Lets a caller show the
 * target without paying for a render it would throw away. */
export async function availableTarget(
  deps: ExportTargetDeps,
  targetId: string,
): Promise<ExportTargetInfo | null> {
  const target = await enabledTarget(deps, targetId);
  return target ? toTargetInfo(target) : null;
}

/** Render a document for one target, or `null` when the target is unknown or
 * disabled. */
export async function renderExport(
  deps: ExportTargetDeps,
  doc: ExportDocument,
  targetId: string,
): Promise<RenderedExport | null> {
  const target = await enabledTarget(deps, targetId);
  if (!target) return null;

  const configuration = await deps.configuration.load();
  const values = {
    ...configuration.optionsFor(target.id),
    baseUrl: configuration.publicBaseUrl,
  };
  return {
    target: toTargetInfo(target),
    filename: exportFilename(doc.title, target.extension),
    mime: target.mime,
    payload: await target.render(doc, values),
  };
}

async function enabledTarget(
  deps: ExportTargetDeps,
  targetId: string,
): Promise<ExportTarget | null> {
  const target = deps.targets.find((candidate) => candidate.id === targetId);
  if (!target) return null;
  const configuration = await deps.configuration.load();
  return configuration.isEnabled(target.id) ? target : null;
}
