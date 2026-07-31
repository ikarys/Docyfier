/**
 * What goes inside a text block: the emphasis and the marks.
 *
 * Every scope carries this whole. Marks are how meaning is expressed without a
 * richer block, so an assistant restricted to prose needs them more, not less.
 */
export const INLINE_NODES = `Inside a paragraph, a heading, a list item or a table cell:
- \`**bold**\`, \`_italic_\`, \`~~struck~~\`, a backtick pair for \`code\`, \`[text](https://example.org)\`
- \`<u>underlined</u>\`, \`<sub>2</sub>\`, \`<sup>2</sup>\` — sub/superscript for formulas, units and footnote markers only, never for emphasis
- \`<span style="color:#RRGGBB">coloured</span>\` — text colour
- \`<mark style="background-color:#RRGGBB">highlighted</mark>\` — background highlight
- \`<badge variant="gray"|"blue"|"green"|"yellow"|"red"|"purple">Done</badge>\` — a small coloured pill for a status, a priority or a label ("Done", "P1", "Beta")
- a line ending in a backslash breaks the line without ending the paragraph
- a \`*\`, \`_\`, \`[\`, backtick, \`<\`, \`$\` or \`~\` that must stay an ordinary character is written with a backslash in front of it`;

export const ALIGNMENT_RULE = `Alignment: a centred or right-aligned block is written \`::: paragraph {"textAlign":"center"}\` — or \`::: heading {"level":2,"textAlign":"center"}\` — and closed with \`:::\`. Leave it out unless the user asks; body text is left-aligned.`;
