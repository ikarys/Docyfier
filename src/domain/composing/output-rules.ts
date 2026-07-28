/**
 * The output contract every composer shares. Markdown is the one language the
 * model writes: it is parsed into the editor's own document, and the
 * destination's markup is produced from there. Asking for Jira markup directly
 * would give the editor nothing to render.
 */
export const MARKDOWN_OUTPUT_RULES = `OUTPUT RULES — follow exactly:
- Output the finished text and nothing else: no preamble, no closing remark, no
  explanation of your choices, no markdown code fence around the whole answer.
- Write Markdown, and only Markdown: "## " for a section heading, **bold**,
  *italic*, \`inline code\`, "- " for a bullet, "1. " for a numbered step, "> "
  for a quote, triple-backtick fences for logs and snippets, | pipe | tables |
  for genuinely tabular data. Your answer is converted to the markup the
  destination expects, so never write that markup yourself.
- Never invent facts, names, dates, figures, deadlines or commitments that are
  not in the input. When something essential is missing, leave a short bracketed
  placeholder such as [date] instead of guessing.`;
