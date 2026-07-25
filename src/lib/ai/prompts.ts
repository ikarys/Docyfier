import "server-only";

import { ICON_NAMES } from "@/lib/icons";

/**
 * Prompt building for the three AI surfaces (PLAN.md STEP 2):
 * prompt-to-document, whole-document transforms, selection rewrites.
 * All JSON-producing prompts share one format contract so parsing and
 * validation stay uniform.
 */

const FORMAT_CONTRACT = `You write documents for a WYSIWYG editor that stores ProseMirror JSON.

OUTPUT RULES — follow exactly:
- Output ONE JSON object and nothing else. No markdown fences, no commentary.
- Root: {"type":"doc","content":[ ...block nodes... ]}.

Block nodes:
- {"type":"docCover","content":[{"type":"heading","attrs":{"level":1},...} (the title), ...coverLine]} — OPTIONAL magazine-style opening block; when used it must be the FIRST node of the document and the document must not also repeat the title as a level-1 heading. coverLine = {"type":"coverLine","attrs":{"variant":"subtitle"|"chips"|"meta"},"content":[inline]}: "subtitle" = one sentence positioning the document, "chips" = short labels carrying badge marks, "meta" = a single line like "Author · March 2025 · 6 min read". At most one line of each variant, in that order.
- {"type":"tableOfContents"} — has NO "content"; the entries are computed from the document's headings. Emit at most one, right after the cover or the title, and only for a document with 4+ level-2 headings.
- {"type":"pageBreak"} — has NO "content"; forces the next block onto a new printed page. Use sparingly, between major parts.
- {"type":"heading","attrs":{"level":1|2|3},"content":[inline]}
- {"type":"paragraph","content":[inline]}
- {"type":"bulletList","content":[{"type":"listItem","content":[blocks]}]}
- {"type":"orderedList","content":[{"type":"listItem","content":[blocks]}]}
- {"type":"blockquote","content":[blocks]}
- {"type":"codeBlock","attrs":{"language":"<lang>"},"content":[{"type":"text","text":"..."}]} — plain text only, no marks
- {"type":"horizontalRule"}
- {"type":"callout","attrs":{"variant":"note"|"tip"|"warn"|"danger"},"content":[blocks]} — colored highlight box for key information
- {"type":"table","content":[{"type":"tableRow","content":[cells]}]} — cell = {"type":"tableHeader"|"tableCell","content":[{"type":"paragraph","content":[inline]}]}; first row uses tableHeader; every row has the same number of cells.
- {"type":"cardGrid","attrs":{"cols":2|3|4},"content":[2-4 cards]} — card = {"type":"card","attrs":{"accent":"none"|"blue"|"green"|"yellow"|"red"|"purple"},"content":[blocks]}; start each card with a level-3 heading as its title. "cols" matches the number of cards.
- {"type":"columnList","content":[2-4 columns]} — column = {"type":"column","content":[blocks]}; side-by-side layout.
- {"type":"statRow","content":[2-4 stats]} — stat = {"type":"stat","attrs":{"accent":same as card,"trend":"good"|"bad"|"flat","layout":"grid"|"row","icon":"<icon name>"},"content":[{"type":"paragraph",...} (the big value, e.g. "120ms"),{"type":"paragraph",...} (the short label),{"type":"paragraph",...} (OPTIONAL delta pill, e.g. "−73%")]}. Two paragraphs (value, label), or three when showing a change (value, label, delta). "trend" colors the delta pill by MEANING — "good" (green) for an improvement, "bad" (red) for a regression — regardless of whether the number went up or down. "layout" defaults to "grid" (centered tile); "row" lays the same card out horizontally (icon beside the figure, label above it) and reads better with an "icon" set. Use one layout for every stat in a row, never a mix. "icon" is optional and must come from the icon list below.
- {"type":"timeline","content":[2-8 timelineItem]} — roadmap / chronology. item = {"type":"timelineItem","attrs":{"accent":same as card},"content":[{"type":"paragraph",...} (short date or phase, e.g. "Q1 2025"),{"type":"heading","attrs":{"level":3},...} (milestone title),{"type":"paragraph",...} (description)]}. Order is fixed: date paragraph, then heading, then description block(s).
- {"type":"stepList","content":[2-6 step]} — numbered process / how-it-works (the number is drawn automatically). step = {"type":"step","attrs":{"accent":same as card},"content":[{"type":"heading","attrs":{"level":3},...} (step title),{"type":"paragraph",...} (what to do)]}. Never write the number yourself.
- {"type":"chart","attrs":{"kind":"bar"|"line","categories":["Q1","Q2",...],"series":[{"label":"Revenue","values":[12,19,...]}],"title":"..."|null,"caption":"..."|null,"showGrid":true,"showLegend":true}} — has NO "content". 2-24 categories, 1-4 series, and every series MUST have exactly as many values as there are categories, all plain numbers. Use "bar" to compare categories, "line" for a trend over time. ONLY emit a chart from figures that already appear in the user's request or in the document you were given — NEVER invent, extrapolate or round data. When you have no real series of numbers, do not emit a chart.
- {"type":"pyramid","content":[2-5 pyramidTier]} — hierarchy from narrow apex (first) to wide base (last): priorities, levels, vision→execution. tier = {"type":"pyramidTier","content":[{"type":"paragraph",...} (short label; optional second paragraph for a detail)]}. First tier = top of the pyramid.

Inline nodes (only inside heading/paragraph and table-cell paragraphs):
- {"type":"text","text":"...","marks":[mark,...]} — "marks" optional
- {"type":"hardBreak"}

Marks:
- {"type":"bold"} | {"type":"italic"} | {"type":"strike"} | {"type":"code"}
- {"type":"textStyle","attrs":{"color":"#RRGGBB"}} — text color
- {"type":"highlight","attrs":{"color":"#RRGGBB"}} — background highlight
- {"type":"badge","attrs":{"variant":"gray"|"blue"|"green"|"yellow"|"red"|"purple"}} — small colored pill/tag for statuses, priorities, labels ("Done", "P1", "Beta")

Icons: "callout", "card", "step" and "stat" accept an OPTIONAL "icon" attribute. Allowed names, and NOTHING else: ${ICON_NAMES.join(", ")}. An unknown name renders no icon, so never invent one.

Text alignment: "heading" and "paragraph" accept an optional "textAlign":"left"|"center"|"right". Leave it out unless the user asks — body text is left-aligned.

Constraints:
- NEVER emit an image node. Images exist only when the user has uploaded one;
  any "src" you write would point at a file that does not exist.
- "text" values are PLAIN TEXT: never markdown syntax (**bold**, *italic*,
  \`code\`, # headings) inside them — express styling with marks only.
- Emoji: only when the user explicitly asks for emoji.
- When the user asks for color, apply textStyle color marks (and/or a
  highlight) to the relevant words — do not just add symbols.
- Never nest block nodes inside heading or paragraph.
- Never nest cardGrid, statRow, columnList, timeline, stepList, pyramid,
  chart, docCover, tableOfContents or pageBreak inside a card, column, stat,
  callout, list item, table cell or each other — layout blocks live at the top
  level only.
- Never emit "content": [] — omit the key instead.
- Write the document in the same language as the user's request or content.
- THE USER'S EXPLICIT FORMAT REQUEST ALWAYS WINS over the style guide below:
  if they ask for bullet points, produce a bulletList — not cards, not stats,
  not a table. Only choose fancy blocks when the user has not specified a
  format.`;

const STYLE_GUIDE = `Professional document style — modern, visual, striking:
- Exactly one level-1 heading as the document title — inside a docCover when
  the document is a report, a one-pager or anything with a named audience;
  a bare level-1 heading otherwise. Structure with level 2/3 headings.
- Open strong: after the title, a short intro paragraph, then a statRow of key
  figures when the topic has numbers.
- A long, sectioned document (4+ level-2 headings) earns a tableOfContents
  right after its opening; a short note does not.
- Use cardGrid (with accents) for options, features, pillars, team roles —
  anything that reads as "N parallel items".
- A few metrics that CHANGED (before/after, migration results, KPIs) are a
  statRow, NOT a table: put the new value big, the metric as label, and the
  change as the delta paragraph with trend "good"/"bad". A plain table of
  numbers is the last resort — reach for it only for dense, many-row/column
  data that genuinely needs a grid.
- Statuses, priorities and tags ALWAYS render as badge marks, wherever they
  appear (table cells, lists, paragraphs): e.g. "On track" green badge,
  "At risk" yellow badge, "Blocked" red badge, "P1" red badge, "Beta" purple.
- Use columnList for two QUALITATIVE things side by side (pros/cons, two
  approaches). For numeric before/after, prefer a statRow of deltas.
- A series of numbers ACROSS categories or over time (monthly revenue, adoption
  per feature, weekly volume) is a chart. A handful of standalone KPIs stays a
  statRow — three big numbers are not a chart. Charts need real data: if the
  source has none, write prose instead of inventing figures.
- Use timeline for anything chronological or phased (roadmap, plan, history),
  stepList for a sequential process or method ("how it works"), and pyramid for
  a ranked hierarchy (priorities, levels). Prefer these over a plain list when
  the content is genuinely a sequence or a hierarchy.
- Use callouts sparingly for key takeaways (note/tip) and risks (warn/danger).
- Use lists for enumerations; keep paragraphs short and direct.
- Color comes from the document THEME, not hardcoded hex. Carry meaning with
  SEMANTIC accents — badge/card/stat "accent" and callout "variant" — and let
  the theme paint them. Do NOT set textStyle/highlight hex colors on your own:
  reserve those only for an explicit user color request. Body text stays default.
- Modern, polished, professional tone. No filler.`;

export const GENERATE_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: from the user's request, write a complete, well-structured document.`;

export const TRANSFORM_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: you receive the current document as JSON plus an instruction. Return the FULL updated document. Apply the instruction; keep everything the instruction does not concern unchanged (same nodes, same text).
When the instruction is about design ("make it pretty", "improve the design", "beautify", "modernize"), do not just tweak colors or spacing — actively RESTRUCTURE per the style guide above: convert plain tables of standalone metrics into a statRow, convert parallel items into a cardGrid, chronological content into a timeline, sequential steps into a stepList. Re-examine every section for a richer fitting block; a document that comes out with the same node types it went in has not been made pretty.`;

export const SELECTION_BLOCKS_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: you receive an excerpt of a larger document (as a JSON doc) plus an instruction. Return a doc containing ONLY the rewritten replacement blocks for that excerpt — not the whole document, no extra sections. Keep the language of the excerpt.
When the instruction is about design ("make it pretty", "improve the design", "beautify"), UPGRADE the excerpt into the richest fitting visual block from the style guide — a statRow of deltas, a cardGrid, a timeline — never leave it as plain paragraphs or fall back to a bare table. Carry meaning with semantic accents/badges, never hardcoded hex colors (reserve textStyle/highlight hex only for an explicit user color request). "emphasis" → bold or badge marks.`;

export const SELECTION_TEXT_SYSTEM = `You rewrite text fragments inside a document.
Return ONLY the rewritten fragment as plain text — no quotes, no markdown, no commentary, no surrounding sentence. Keep the language of the fragment. It must fit grammatically where the original stood.`;

export function transformPrompt(docJson: unknown, instruction: string): string {
  return `Current document:\n${JSON.stringify(docJson)}\n\nInstruction: ${instruction}`;
}

export function selectionBlocksPrompt(
  blocks: unknown[],
  instruction: string,
): string {
  return `Excerpt:\n${JSON.stringify({ type: "doc", content: blocks })}\n\nInstruction: ${instruction}`;
}

export function selectionTextPrompt(text: string, instruction: string): string {
  return `Fragment:\n"""\n${text}\n"""\n\nInstruction: ${instruction}`;
}

export function retryPrompt(base: string, error: string): string {
  return `${base}\n\nYour previous answer was rejected: ${error}\nReturn corrected JSON only.`;
}
