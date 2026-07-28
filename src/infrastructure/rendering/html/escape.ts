/**
 * The one place text becomes markup-safe.
 *
 * Every renderer in this folder goes through it: a block that builds a tag by
 * hand and forgets it is how a document title turns into an unclosed element in
 * the receiving editor.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
