/**
 * What a good document looks like, whatever its kind.
 *
 * The rules that hold for a postmortem as much as for a roadmap live here; the
 * ones that only hold for one kind belong to that kind's recipe.
 */
export const STYLE_GUIDE = `Professional document style — modern, visual, striking:
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
