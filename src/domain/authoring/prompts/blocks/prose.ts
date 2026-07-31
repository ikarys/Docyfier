/**
 * The blocks that carry words.
 *
 * Every surface sees these: they are what a document is made of before anyone
 * decides how it should look, and an assistant that owns only the wording still
 * has to return a list as a list and a table as a table.
 */
export const PROSE_BLOCKS = `- {"type":"heading","attrs":{"level":1|2|3},"content":[inline]}
- {"type":"paragraph","content":[inline]}
- {"type":"bulletList","content":[{"type":"listItem","content":[blocks]}]}
- {"type":"orderedList","content":[{"type":"listItem","content":[blocks]}]}
- {"type":"blockquote","content":[blocks]}
- {"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true|false},"content":[blocks]}]} — actions, acceptance criteria, checklists. Use it whenever the items are things to DO, not things to read; a plain bulletList otherwise.
- {"type":"details","content":[{"type":"detailsSummary","content":[inline]},{"type":"detailsContent","content":[blocks]}]} — a section the reader opens: long appendices, raw logs, an aside that would break the flow. Never hide the point of the document inside one.
- {"type":"codeBlock","attrs":{"language":"<lang>"},"content":[{"type":"text","text":"..."}]} — plain text only, no marks
- {"type":"horizontalRule"}
- {"type":"blockMath","attrs":{"latex":"..."}} — has NO "content"; a display formula in LaTeX. Inline, inside a paragraph: {"type":"inlineMath","attrs":{"latex":"..."}}. Only for real mathematics or units — never to typeset ordinary prose.
- {"type":"table","content":[{"type":"tableRow","content":[cells]}]} — cell = {"type":"tableHeader"|"tableCell","content":[{"type":"paragraph","content":[inline]}]}; first row uses tableHeader; every row has the same number of cells.`;
