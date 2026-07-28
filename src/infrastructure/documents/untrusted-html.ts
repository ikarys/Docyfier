/**
 * What must never reach a document from HTML written elsewhere: images (their
 * `src` would point at a file this instance does not serve — the same rule the
 * AI format contract enforces) and anything executable or presentational.
 *
 * One home, because it is one rule: an imported file and a pasted fragment are
 * both HTML this instance did not write.
 */
export function stripUnsupportedHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<input[^>]*>/gi, "");
}
