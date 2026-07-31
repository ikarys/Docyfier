/**
 * The blocks that carry words.
 *
 * Every surface sees these: they are what a document is made of before anyone
 * decides how it should look, and an assistant that owns only the wording still
 * has to return a list as a list and a table as a table.
 *
 * Written in markdown since STEP U14. A syntax the model already knows costs a
 * fraction of the same vocabulary spelled out as JSON, and it gets answers back
 * that are invalid less often — which matters more, because a rejected answer
 * is a retry, and a retry is the wait paid twice.
 */
export const PROSE_BLOCKS = `- \`# Title\`, \`## Section\`, \`### Sub-section\` — headings, levels 1 to 3
- a line of text on its own is a paragraph
- \`- item\` a bullet list, \`1. item\` a numbered one. One paragraph per item; a list nested under an item is indented by two spaces.
- \`- [ ] item\` / \`- [x] item\` — a checklist. Use it whenever the items are things to DO, not things to read; a plain bullet list otherwise.
- \`> quoted\` — a blockquote, with \`>\` on every one of its lines
- a fenced code block: three backticks and the language, the code, three backticks. Plain text, no marks inside.
- \`---\` alone on its line — a horizontal rule
- \`$$\` on a line, the LaTeX, then \`$$\` — a display formula; \`$x$\` inline. Only for real mathematics or units, never to typeset ordinary prose.
- a table: \`| A | B |\`, then \`| --- | :---: |\` giving each column's alignment, then one line per row. The first row is the header and every row has the same number of cells.
- \`::: details {"open":false}\` — a section the reader opens: long appendices, raw logs, an aside that would break the flow. It holds \`::: detailsSummary\` (the visible line) then \`::: detailsContent\` (the blocks). Never hide the point of the document inside one.`;
