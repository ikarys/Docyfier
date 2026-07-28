import type { ComposerValues } from "./composer";

/**
 * Where a composed answer ends up.
 *
 * The model writes Markdown, once, for every destination; the markup each
 * destination reads is produced from the edited document afterwards. Which
 * markup that is stays data rather than a branch in the form.
 */

/**
 * The markup one destination reads: rich HTML for a mail client, Jira wiki
 * markup for a Jira description, Markdown for a GitLab issue, plain text for a
 * field that renders nothing.
 */
export type ComposeFormat = "html" | "markdown" | "jira" | "text";

/**
 * Which of those the Copy button produces. A composer whose destination is
 * fixed declares one format; a composer where the user picks the destination
 * names the select that decides.
 */
export interface ComposeClipboard {
  /** Used when no field decides, or when its value is not in `by`. */
  default: ComposeFormat;
  /** Id of the `select` whose value picks the format. */
  field?: string;
  by?: Record<string, ComposeFormat>;
}

/** The format the Copy button should produce for the current form values. */
export function clipboardFormat(
  clipboard: ComposeClipboard,
  values: ComposerValues,
): ComposeFormat {
  const chosen = clipboard.field ? values[clipboard.field] : undefined;
  return (chosen && clipboard.by?.[chosen]) || clipboard.default;
}
