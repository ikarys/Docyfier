/**
 * The name a downloaded export lands under.
 *
 * A document title is free text — slashes, accents, colons, any length — and it
 * ends up as a filename on a stranger's disk. Everything a filesystem or a
 * Content-Disposition header would choke on is dropped here, once, rather than
 * per target.
 */

/** Longest base name, extension aside. Well under every filesystem's limit. */
const MAX_LENGTH = 80;

export function exportFilename(title: string, extension: string): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, MAX_LENGTH) || "document";
  return `${base}.${extension}`;
}
