/**
 * The blocks a document has once and a passage never has at all.
 *
 * A cover, a table of contents and a page break are statements about the whole
 * document. Describing them to a surface that edits three paragraphs is how a
 * selection rewrite comes back with a second title.
 */
export const DOCUMENT_BLOCKS = `- \`::: docCover\` — OPTIONAL magazine-style opening block; when used it must be the FIRST block of the document, and the document must not also repeat the title as a \`#\` heading. It holds a \`#\` heading (the title) then \`::: coverLine {"variant":"subtitle"|"chips"|"meta"}\` lines: "subtitle" = one sentence positioning the document, "chips" = short labels carrying \`<badge>\` marks, "meta" = a single line like "Author · March 2025 · 6 min read". At most one line of each variant, in that order.
- \`::: tableOfContents\` — no content, closed on the next line; the entries are computed from the document's headings. Emit at most one, right after the cover or the title, and only for a document with 4+ \`##\` headings.
- \`::: pageBreak\` — no content, closed on the next line; forces the next block onto a new printed page. Use sparingly, between major parts.`;
