import { ICON_NAMES } from "../../icons";

/**
 * The blocks that present content — the vocabulary of the layout assistant.
 *
 * Two thirds of the format contract lives here, and the writer is forbidden to
 * emit a single one of them. Keeping them apart is what lets a wording pass
 * carry a third of the prompt a whole-document pass does.
 */
export const LAYOUT_BLOCKS = `- {"type":"callout","attrs":{"variant":"note"|"tip"|"warn"|"danger"},"content":[blocks]} — colored highlight box for key information
- {"type":"cardGrid","attrs":{"cols":2|3|4},"content":[2-4 cards]} — card = {"type":"card","attrs":{"accent":"none"|"blue"|"green"|"yellow"|"red"|"purple"},"content":[blocks]}; start each card with a level-3 heading as its title. "cols" matches the number of cards.
- {"type":"columnList","content":[2-4 columns]} — column = {"type":"column","content":[blocks]}; side-by-side layout.
- {"type":"statRow","content":[2-4 stats]} — stat = {"type":"stat","attrs":{"accent":same as card,"trend":"good"|"bad"|"flat","layout":"grid"|"row","icon":"<icon name>"},"content":[{"type":"paragraph",...} (the big value, e.g. "120ms"),{"type":"paragraph",...} (the short label),{"type":"paragraph",...} (OPTIONAL delta pill, e.g. "−73%")]}. Two paragraphs (value, label), or three when showing a change (value, label, delta). "trend" colors the delta pill by MEANING — "good" (green) for an improvement, "bad" (red) for a regression — regardless of whether the number went up or down. "layout" defaults to "grid" (centered tile); "row" lays the same card out horizontally (icon beside the figure, label above it) and reads better with an "icon" set. Use one layout for every stat in a row, never a mix. "icon" is optional and must come from the icon list below.
- {"type":"timeline","content":[2-8 timelineItem]} — roadmap / chronology. item = {"type":"timelineItem","attrs":{"accent":same as card},"content":[{"type":"paragraph",...} (short date or phase, e.g. "Q1 2025"),{"type":"heading","attrs":{"level":3},...} (milestone title),{"type":"paragraph",...} (description)]}. Order is fixed: date paragraph, then heading, then description block(s).
- {"type":"stepList","content":[2-6 step]} — numbered process / how-it-works (the number is drawn automatically). step = {"type":"step","attrs":{"accent":same as card},"content":[{"type":"heading","attrs":{"level":3},...} (step title),{"type":"paragraph",...} (what to do)]}. Never write the number yourself.
- {"type":"chart","attrs":{"kind":"bar"|"line","categories":["Q1","Q2",...],"series":[{"label":"Revenue","values":[12,19,...]}],"title":"..."|null,"caption":"..."|null,"showGrid":true,"showLegend":true}} — has NO "content". 2-24 categories, 1-4 series, and every series MUST have exactly as many values as there are categories, all plain numbers. Use "bar" to compare categories, "line" for a trend over time. ONLY emit a chart from figures that already appear in the user's request or in the document you were given — NEVER invent, extrapolate or round data. When you have no real series of numbers, do not emit a chart.
- {"type":"diagram","attrs":{"kind":"flow"|"architecture"|"sequence"|"hierarchy"|"timeline","direction":"down"|"right","nodes":[{"id":"a","label":"Request","note":"optional second line","accent":1-4,"group":"g1"}],"edges":[{"from":"a","to":"b","label":"yes"|null,"style":"solid"|"dashed","head":"arrow"|"none"}],"groups":[{"id":"g1","label":"Backend"}],"title":"..."|null,"caption":"..."|null} — has NO "content". You declare MEANING ONLY: never a coordinate, a width or a position — the editor places every box. 1-24 nodes, at most 40 edges, ids unique, and every "from"/"to" MUST name a declared node. "note", "accent" and "group" are optional; a "group" must appear in "groups" and draws a labelled band (architecture only, in practice). Kinds: "flow" = a process, which MAY loop back; "architecture" = named parts of a system, usually grouped; "sequence" = participants exchanging messages, one edge per message IN ORDER, needs 2+ nodes and 1+ edge; "hierarchy" = a TREE, exactly one root and exactly one parent per other node, no cycles; "timeline" = phases in the order of "nodes" and NO edges at all. ONLY draw relations stated in the user's request or already present in the document — NEVER invent an architecture, a team or a process you were not given.
- {"type":"pyramid","content":[2-5 pyramidTier]} — hierarchy from narrow apex (first) to wide base (last): priorities, levels, vision→execution. tier = {"type":"pyramidTier","content":[{"type":"paragraph",...} (short label; optional second paragraph for a detail)]}. First tier = top of the pyramid.`;

/**
 * The same blocks named without their syntax — what a prose-only assistant is
 * told about them. It has to recognise one in the passage it was handed and
 * give it back untouched; it never has to build one.
 */
export const LAYOUT_BLOCK_NAMES =
  "callout, cardGrid, columnList, statRow, timeline, stepList, chart, diagram, pyramid";

/** Only the blocks above take an icon, so only they carry the list of names. */
export const ICON_RULE = `Icons: "callout", "card", "step" and "stat" accept an OPTIONAL "icon" attribute. Allowed names, and NOTHING else: ${ICON_NAMES.join(", ")}. An unknown name renders no icon, so never invent one.`;
