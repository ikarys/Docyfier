import "server-only";

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
- {"type":"statRow","content":[2-4 stats]} — stat = {"type":"stat","attrs":{"accent":same as card},"content":[{"type":"paragraph",...} (the big value, e.g. "42%"),{"type":"paragraph",...} (the short label)]}. Exactly two paragraphs per stat.

Inline nodes (only inside heading/paragraph and table-cell paragraphs):
- {"type":"text","text":"...","marks":[mark,...]} — "marks" optional
- {"type":"hardBreak"}

Marks:
- {"type":"bold"} | {"type":"italic"} | {"type":"strike"} | {"type":"code"}
- {"type":"textStyle","attrs":{"color":"#RRGGBB"}} — text color
- {"type":"highlight","attrs":{"color":"#RRGGBB"}} — background highlight
- {"type":"badge","attrs":{"variant":"gray"|"blue"|"green"|"yellow"|"red"|"purple"}} — small colored pill/tag for statuses, priorities, labels ("Done", "P1", "Beta")

Constraints:
- Never nest block nodes inside heading or paragraph.
- Never emit "content": [] — omit the key instead.
- Write the document in the same language as the user's request or content.`;

const STYLE_GUIDE = `Professional document style — modern, visual, striking:
- Exactly one level-1 heading as the document title; structure with level 2/3 headings.
- Open strong: after the title, a short intro paragraph, then a statRow of key
  figures when the topic has numbers.
- Use cardGrid (with accents) for options, features, pillars, team roles —
  anything that reads as "N parallel items".
- Use tables for comparisons, criteria, figures or any tabular data.
- Use badges for statuses, priorities and tags inside lists and table cells.
- Use columnList to place two related things side by side (before/after,
  pros/cons).
- Use callouts sparingly for key takeaways (note/tip) and risks (warn/danger).
- Use lists for enumerations; keep paragraphs short and direct.
- Colors: a restrained professional palette (e.g. deep blue #3b5bdb for section
  names/keywords, green #1f9d6b for positives, red #c23b3b for risks, soft
  yellow highlight #fff3bf for emphasis). Never more than 2-3 colors per
  document; body text stays default.
- Modern, polished, professional tone. No filler.`;

export const GENERATE_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: from the user's request, write a complete, well-structured document.`;

export const TRANSFORM_SYSTEM = `${FORMAT_CONTRACT}

${STYLE_GUIDE}

Task: you receive the current document as JSON plus an instruction. Return the FULL updated document. Apply the instruction; keep everything the instruction does not concern unchanged (same nodes, same text).`;

export const SELECTION_BLOCKS_SYSTEM = `${FORMAT_CONTRACT}

Task: you receive an excerpt of a larger document (as a JSON doc) plus an instruction. Return a doc containing ONLY the rewritten replacement blocks for that excerpt — not the whole document, no extra sections. Keep the language of the excerpt.`;

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
