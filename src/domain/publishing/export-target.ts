import type { DocumentBody } from "@/domain/documents/body";

/**
 * Export targets — the port a destination implements (PLAN.md STEP 5).
 *
 * A target turns a document into the payload one external tool understands:
 * Word, Confluence, Notion, Trilium. Adding one means adding an adapter under
 * `infrastructure/publishing/targets/` and listing it in the registry; nothing
 * else in the app changes.
 *
 * Targets are pure functions of the document plus their own options: no fetch,
 * no filesystem, no credentials. Delivery is out of scope on purpose — the user
 * copies the payload or downloads it, so this half never needs an API token for
 * a tool the instance may not even be able to reach.
 */

export interface ExportDocument {
  title: string;
  content: DocumentBody;
}

/** A per-target setting, rendered as a field on the Exports settings page. */
export interface ExportOption {
  id: string;
  label: string;
  help?: string;
  /** `toggle` values are "on" / "off". A `secret` holds a credential: it is
   * stored encrypted, never sent back to the browser, and an empty field on
   * save means "keep the stored one". */
  type: "toggle" | "select" | "secret";
  choices?: { value: string; label: string }[];
  default: string;
}

export type ExportOptionValues = Record<string, string>;

/** What a target produces. Bytes for the formats that are archives or binary
 * documents — a `.docx` is a zip, and there is nothing to paste from it. */
export type ExportPayload = string | Uint8Array<ArrayBuffer>;

export interface ExportTarget {
  id: string;
  label: string;
  /** What this target produces, shown in Settings. */
  description: string;
  /** How to get the payload into the tool, shown above the copy box. */
  instructions: string;
  mime: string;
  /** Extension of the downloaded file, without the dot. */
  extension: string;
  /** True when the payload is bytes: the export page then offers the download
   * alone, since there is nothing a user could paste. */
  binary?: boolean;
  options?: ExportOption[];
  render(
    doc: ExportDocument,
    options: ExportOptionValues,
  ): ExportPayload | Promise<ExportPayload>;
}

/**
 * The serializable half of a target. Client components get this — never the
 * target itself, whose `render` would drag every renderer into the browser
 * bundle.
 */
export interface ExportTargetInfo {
  id: string;
  label: string;
  description: string;
  instructions: string;
  extension: string;
  binary: boolean;
  options: ExportOption[];
}

export function toTargetInfo(target: ExportTarget): ExportTargetInfo {
  return {
    id: target.id,
    label: target.label,
    description: target.description,
    instructions: target.instructions,
    extension: target.extension,
    binary: target.binary ?? false,
    options: target.options ?? [],
  };
}

/** An option value, falling back to the target's default. */
export function optionValue(
  target: ExportTarget,
  values: ExportOptionValues,
  id: string,
): string {
  const declared = target.options?.find((option) => option.id === id);
  return values[id] ?? declared?.default ?? "";
}

/** Which options of a target hold a credential — what decides that a value is
 * encrypted at rest and never sent back to the browser. */
export function secretOptionsOf(target: ExportTarget): string[] {
  return (target.options ?? [])
    .filter((option) => option.type === "secret")
    .map((option) => option.id);
}
