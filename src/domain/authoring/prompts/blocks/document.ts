/**
 * The blocks a document has once and a passage never has at all.
 *
 * A cover, a table of contents and a page break are statements about the whole
 * document. Describing them to a surface that edits three paragraphs is how a
 * selection rewrite comes back with a second title.
 */
export const DOCUMENT_BLOCKS = `- {"type":"docCover","content":[{"type":"heading","attrs":{"level":1},...} (the title), ...coverLine]} — OPTIONAL magazine-style opening block; when used it must be the FIRST node of the document and the document must not also repeat the title as a level-1 heading. coverLine = {"type":"coverLine","attrs":{"variant":"subtitle"|"chips"|"meta"},"content":[inline]}: "subtitle" = one sentence positioning the document, "chips" = short labels carrying badge marks, "meta" = a single line like "Author · March 2025 · 6 min read". At most one line of each variant, in that order.
- {"type":"tableOfContents"} — has NO "content"; the entries are computed from the document's headings. Emit at most one, right after the cover or the title, and only for a document with 4+ level-2 headings.
- {"type":"pageBreak"} — has NO "content"; forces the next block onto a new printed page. Use sparingly, between major parts.`;
