import "server-only";
import type { ExportTargetDeps } from "@/application/publishing/deps";
import {
  availableTarget,
  enabledTargets,
  renderExport as render,
  type RenderedExport,
} from "@/application/publishing/render-export";
import type { DocumentRecord } from "@/domain/documents/document";
import type { ExportTargetInfo } from "@/domain/publishing/export-target";
import { aesGcmCipher } from "@/infrastructure/configuration/aes-gcm-cipher";
import { FileExportRepository } from "@/infrastructure/configuration/file-export-repository";
import { EXPORT_TARGETS } from "./registry";

/**
 * Composition root for exporting a document: the registry on one side, the
 * stored configuration on the other. A document becomes the pair a target
 * renders from here, so no target ever meets a stored document.
 */

export type { RenderedExport };

function deps(): ExportTargetDeps {
  return {
    configuration: new FileExportRepository(aesGcmCipher),
    targets: EXPORT_TARGETS,
  };
}

/** Targets the user turned on, in registry order. */
export function enabledExportTargets(): Promise<ExportTargetInfo[]> {
  return enabledTargets(deps());
}

/** One target, if it exists and the user enabled it. */
export function availableExportTarget(targetId: string): Promise<ExportTargetInfo | null> {
  return availableTarget(deps(), targetId);
}

/** Render a document for one target, or `null` when the target is unknown or
 * disabled — a disabled target must not stay reachable by URL. */
export function renderExport(
  doc: DocumentRecord,
  targetId: string,
): Promise<RenderedExport | null> {
  return render(deps(), { title: doc.title, content: doc.content }, targetId);
}
