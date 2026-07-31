import type { StyleParameters } from "../style-parameters";
import { showsDocumentBlocks, showsLayoutBlocks, type ContractScope } from "./scope";

/**
 * What a good document looks like, whatever its kind.
 *
 * The rules that hold for a postmortem as much as for a roadmap live here; the
 * ones that only hold for one kind belong to that kind's recipe, and the ones
 * the instance decides once — emoji, bolding, badges, language — come in as
 * style parameters rather than being frozen in this text.
 *
 * Split the way the format contract is split, and for the same reason: a third
 * of it is advice about a whole document — where the title goes, when a table
 * of contents is earned, how to open — and a surface rewriting three paragraphs
 * has no title and no opening. Telling it about them invites the second title
 * it then has to be argued out of.
 */

/** Rules about the shape of a whole document. Meaningless on a passage. */
const DOCUMENT_RULES = `- Exactly one level-1 heading as the document title — inside a docCover when
  the document is a report, a one-pager or anything with a named audience;
  a bare level-1 heading otherwise. Structure with level 2/3 headings.
- Open strong: after the title, a short intro paragraph, then a statRow of key
  figures when the topic has numbers.
- A long, sectioned document (4+ level-2 headings) earns a tableOfContents
  right after its opening; a short note does not.`;

/** Which block carries which content. True of three paragraphs as of thirty. */
const BLOCK_RULES = `- Use cardGrid (with accents) for options, features, pillars, team roles —
  anything that reads as "N parallel items".
- A few metrics that CHANGED (before/after, migration results, KPIs) are a
  statRow, NOT a table: put the new value big, the metric as label, and the
  change as the delta paragraph with trend "good"/"bad". A plain table of
  numbers is the last resort — reach for it only for dense, many-row/column
  data that genuinely needs a grid.
- Use columnList for two QUALITATIVE things side by side (pros/cons, two
  approaches). For numeric before/after, prefer a statRow of deltas.
- A series of numbers ACROSS categories or over time (monthly revenue, adoption
  per feature, weekly volume) is a chart. A handful of standalone KPIs stays a
  statRow — three big numbers are not a chart. Charts need real data: if the
  source has none, write prose instead of inventing figures.
- A relation between named things is a diagram, not a paragraph describing it:
  a process that BRANCHES or loops (flow), the parts of a system and what talks
  to what (architecture), an exchange between actors in order (sequence), a tree
  of ownership or breakdown (hierarchy). A straight run of steps with no branch
  stays a stepList. Diagrams need real relations: if the source states none, do
  not draw one.
- Use timeline for anything chronological or phased (roadmap, plan, history),
  stepList for a sequential process or method ("how it works"), and pyramid for
  a ranked hierarchy (priorities, levels). Prefer these over a plain list when
  the content is genuinely a sequence or a hierarchy.
- Use callouts sparingly for key takeaways (note/tip) and risks (warn/danger).`;

/** How the words read, and where color comes from. True of every surface. */
const VOICE_RULES = `- Use lists for enumerations; keep paragraphs short and direct.
- Color comes from the document THEME, not hardcoded hex. Carry meaning with
  SEMANTIC accents — badge/card/stat "accent" and callout "variant" — and let
  the theme paint them. Do NOT set textStyle/highlight hex colors on your own:
  reserve those only for an explicit user color request. Body text stays default.
- Modern, polished, professional tone. No filler.`;

const HEADLINE = "Professional document style — modern, visual, striking:";

function rulesFor(scope: ContractScope): string[] {
  if (showsDocumentBlocks(scope)) return [DOCUMENT_RULES, BLOCK_RULES, VOICE_RULES];
  // A prose assistant cannot act on advice about which box to reach for: it is
  // not allowed to reach for one.
  return showsLayoutBlocks(scope) ? [BLOCK_RULES, VOICE_RULES] : [VOICE_RULES];
}

/** The style guide as this instance has it configured, sized for the surface. */
export function styleGuide(style: StyleParameters, scope: ContractScope = "document"): string {
  return `${HEADLINE}\n${rulesFor(scope).join("\n")}\n${style.directives()}`;
}
