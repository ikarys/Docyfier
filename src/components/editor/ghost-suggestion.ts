/**
 * The two rules a continuation needs before it can be shown or accepted
 * (PLAN.md STEP U11). Both are arithmetic on text and positions, kept away from
 * the ProseMirror plugin that applies them so a test can state them plainly.
 */

export interface GhostSuggestion {
  /** Where it was offered — the caret at the moment the model answered. */
  readonly at: number;
  readonly text: string;
}

/**
 * A suggestion stands only while the caret is still where it was offered.
 * Typing on somewhere else means the writer answered the question themselves.
 */
export function ghostStands(ghost: GhostSuggestion, caret: number): boolean {
  return ghost.at === caret;
}

/**
 * What actually goes into the document: the model is asked to continue, not to
 * repeat, so the space between what was written and what was suggested is this
 * side's business — and a continuation that opens on punctuation wants none.
 */
export function continuationJoin(before: string, suggestion: string): string {
  const text = suggestion.trim();
  if (text === "") return "";
  if (before === "" || /\s$/.test(before)) return text;
  return /^[,.;:!?…)\]}»]/.test(text) ? text : ` ${text}`;
}
