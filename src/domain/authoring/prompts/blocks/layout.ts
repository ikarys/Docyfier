import { ICON_NAMES } from "../../icons";

/**
 * The blocks that present content — the vocabulary of the layout assistant.
 *
 * Two thirds of the format contract lives here, and the writer is forbidden to
 * emit a single one of them. Keeping them apart is what lets a wording pass
 * carry a third of the prompt a whole-document pass does.
 */

export const LAYOUT_BLOCKS = `- \`::: callout {"variant":"note"|"tip"|"warn"|"danger","icon":"<icon name>"}\` — a coloured highlight box for key information; holds blocks.
- \`::: cardGrid {"cols":2|3|4}\` — holds 2-4 \`::: card {"accent":"none"|"blue"|"green"|"yellow"|"red"|"purple","icon":"<icon name>"}\`. Start each card with a \`###\` heading as its title. "cols" matches the number of cards.
- \`::: columnList\` — holds 2-4 \`::: column\`; side-by-side layout.
- \`::: statRow\` — holds 2-4 \`::: stat {"accent":same as card,"trend":"good"|"bad"|"flat","layout":"grid"|"row","icon":"<icon name>"}\`. A stat is two paragraphs — the big value, e.g. "120ms", then the short label — or three when showing a change (value, label, delta e.g. "−73%"). "trend" colours the delta pill by MEANING: "good" (green) for an improvement, "bad" (red) for a regression, whichever way the number moved. "layout" defaults to "grid" (centred tile); "row" lays the same card out horizontally and reads better with an "icon" set. One layout for every stat in a row, never a mix.
- \`::: timeline\` — holds 2-8 \`::: timelineItem {"accent":same as card}\` for a roadmap or a chronology. Each one is a paragraph with the date or phase ("Q1 2025"), then a \`###\` milestone title, then the description. That order is fixed.
- \`::: stepList\` — holds 2-6 \`::: step {"accent":same as card,"icon":"<icon name>"}\` for a numbered process. Each one is a \`###\` step title then what to do. The number is drawn automatically: never write it yourself.
- \`::: pyramid\` — holds 2-5 \`::: pyramidTier\`, from narrow apex (first) to wide base (last): priorities, levels, vision→execution. A tier is a short paragraph, optionally a second one for a detail.
- \`::: chart {"kind":"bar"|"line","categories":["Q1","Q2",...],"series":[{"label":"Revenue","values":[12,19,...]}],"title":"..."|null,"caption":"..."|null,"showGrid":true,"showLegend":true}\` — no content, closed on the next line. 2-24 categories, 1-4 series, and every series MUST have exactly as many values as there are categories, all plain numbers. Use "bar" to compare categories, "line" for a trend over time. ONLY emit a chart from figures that already appear in the user's request or in the document you were given — NEVER invent, extrapolate or round data. When you have no real series of numbers, do not emit a chart.
- \`::: diagram {"kind":"flow"|"architecture"|"sequence"|"hierarchy"|"timeline","direction":"down"|"right","nodes":[{"id":"a","label":"Request","note":"optional second line","accent":1-4,"group":"g1"}],"edges":[{"from":"a","to":"b","label":"yes"|null,"style":"solid"|"dashed","head":"arrow"|"none"}],"groups":[{"id":"g1","label":"Backend"}],"title":"..."|null,"caption":"..."|null}\` — no content, closed on the next line. You declare MEANING ONLY: never a coordinate, a width or a position — the editor places every box. 1-24 nodes, at most 40 edges, ids unique, and every "from"/"to" MUST name a declared node. "note", "accent" and "group" are optional; a "group" must appear in "groups" and draws a labelled band (architecture only, in practice). Kinds: "flow" = a process, which MAY loop back; "architecture" = named parts of a system, usually grouped; "sequence" = participants exchanging messages, one edge per message IN ORDER, needs 2+ nodes and 1+ edge; "hierarchy" = a TREE, exactly one root and exactly one parent per other node, no cycles; "timeline" = phases in the order of "nodes" and NO edges at all. ONLY draw relations stated in the user's request or already present in the document — NEVER invent an architecture, a team or a process you were not given.`;

/**
 * The same blocks named without their syntax — what a prose-only assistant is
 * told about them. It has to recognise one in the passage it was handed and
 * give it back untouched; it never has to build one.
 */
export const LAYOUT_BLOCK_NAME_LIST = [
  "callout",
  "cardGrid",
  "columnList",
  "statRow",
  "timeline",
  "stepList",
  "chart",
  "diagram",
  "pyramid",
] as const;

export const LAYOUT_BLOCK_NAMES = LAYOUT_BLOCK_NAME_LIST.join(", ");

/** Only the blocks above take an icon, so only they carry the list of names. */
export const ICON_RULE = `Icons: \`callout\`, \`card\`, \`step\` and \`stat\` accept an OPTIONAL "icon" attribute. Allowed names, and NOTHING else: ${ICON_NAMES.join(", ")}. An unknown name renders no icon, so never invent one.`;
