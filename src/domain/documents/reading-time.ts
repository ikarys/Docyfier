/**
 * How long a document takes to read (PLAN.md STEP U8).
 *
 * A rounded-up count of minutes at an ordinary prose pace. It is a reading of
 * the document, not a setting, so it lives with the document and not with the
 * toolbar that happens to show it.
 */

const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return words <= 0 ? 0 : Math.ceil(words / WORDS_PER_MINUTE);
}
