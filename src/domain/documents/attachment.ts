/**
 * A file carried by a document (PLAN.md STEP U10): how its row reads.
 *
 * The editor draws it, every export writes it as a link, and both want the
 * same words — so the words are decided here and nowhere else.
 */

/** How heavy a file is, in the unit a reader would use, or null if unrecorded. */
export function fileSizeLabel(bytes: number): string | null {
  if (!Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1000) return `${Math.round(bytes)} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} kB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/** The file row: its name, and what it weighs when that is known. */
export function attachmentLabel(name: string, bytes: number): string {
  const called = name.trim() || "Attachment";
  const size = fileSizeLabel(bytes);
  return size ? `${called} · ${size}` : called;
}
