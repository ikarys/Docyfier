import { nodeText, titleHeading, type DocumentBody } from "./body";

/**
 * A document's name.
 *
 * The title normally *follows* the content: whatever the first heading says is
 * what the list shows. An explicit rename overrides that and freezes the name
 * until it is cleared. Both forms are bounded, because a title is also a row in
 * a list and a filename.
 */

export const UNTITLED = "Untitled document";

/** Longest stored title. A rename longer than this is cut, not refused. */
export const MAX_TITLE = 200;

/**
 * Longest title derived from prose. A document with no heading falls back to
 * its first text, which can be a whole paragraph — the list needs a label, not
 * an excerpt. A real heading is never cut: the user chose its length.
 */
const MAX_DERIVED = 80;

/** The name the content gives itself. Never empty. */
export function deriveTitle(body: DocumentBody): string {
  const heading = titleHeading(body);
  const fromHeading = heading && nodeText(heading).trim();
  if (fromHeading) return fromHeading;

  const fromText = (body.content ?? [])
    .map(nodeText)
    .find((text) => text.trim());
  return fromText?.trim().slice(0, MAX_DERIVED) || UNTITLED;
}

/**
 * A rename, as it is stored: `null` when the user cleared the field, which
 * hands the title back to the content instead of freezing it on a blank string.
 */
export function titleOverride(raw: string): string | null {
  return raw.trim().slice(0, MAX_TITLE) || null;
}

/** The name a copy takes, so two documents never show the same one. */
export function copyOf(title: string): string {
  return `Copy of ${title}`.slice(0, MAX_TITLE);
}
