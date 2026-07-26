/**
 * What the import accepts (PLAN.md STEP 5). Client-safe: the picker in
 * `ImportCard.tsx` and the server-side conversion in `./import.ts` must agree
 * on the same list, so it lives outside the server-only module.
 */

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/** Extensions the picker offers and the action accepts. PDF is deliberately
 * absent: a PDF carries layout, not structure. */
export const IMPORT_EXTENSIONS = [".md", ".markdown", ".txt", ".docx"] as const;

export function importExtensionOf(filename: string): string | null {
  const lower = filename.toLowerCase();
  return IMPORT_EXTENSIONS.find((ext) => lower.endsWith(ext)) ?? null;
}

/** Filename without its extension — the title for a file that carries no
 * heading of its own. */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^./\\]+$/, "").replace(/[_-]+/g, " ").trim();
  return base.slice(0, 200);
}
