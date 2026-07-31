/**
 * What goes inside a text block: the inline nodes and the marks.
 *
 * Every scope carries this whole. Marks are how meaning is expressed without a
 * richer block, so an assistant restricted to prose needs them more, not less.
 */
export const INLINE_NODES = `Inline nodes (only inside heading/paragraph and table-cell paragraphs):
- {"type":"text","text":"...","marks":[mark,...]} — "marks" optional
- {"type":"hardBreak"}

Marks:
- {"type":"bold"} | {"type":"italic"} | {"type":"strike"} | {"type":"code"} | {"type":"subscript"} | {"type":"superscript"} — sub/superscript for formulas, units and footnote markers only, never for emphasis
- {"type":"textStyle","attrs":{"color":"#RRGGBB"}} — text color
- {"type":"highlight","attrs":{"color":"#RRGGBB"}} — background highlight
- {"type":"badge","attrs":{"variant":"gray"|"blue"|"green"|"yellow"|"red"|"purple"}} — small colored pill/tag for statuses, priorities, labels ("Done", "P1", "Beta")`;

export const ALIGNMENT_RULE = `Text alignment: "heading" and "paragraph" accept an optional "textAlign":"left"|"center"|"right". Leave it out unless the user asks — body text is left-aligned.`;
