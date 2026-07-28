import type { ExportConfigurationRepository } from "@/domain/publishing/export-repository";
import type { ExportTarget } from "@/domain/publishing/export-target";

/**
 * What the publishing use cases are handed. Split in two so configuring the
 * targets never needs the targets themselves: the settings page stays reachable
 * whatever a target's renderer does.
 */

export interface ExportConfigurationDeps {
  configuration: ExportConfigurationRepository;
}

export interface ExportTargetDeps extends ExportConfigurationDeps {
  /** The targets this build ships, in the order the pages list them. */
  targets: readonly ExportTarget[];
}
