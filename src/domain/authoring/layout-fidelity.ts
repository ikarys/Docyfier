import type { DocumentNode } from "@/domain/documents/body";

/**
 * What the layout assistant is allowed to do to a passage (PLAN.md STEP U13).
 *
 * The two assistants only stay two if this rule holds: the writer owns the
 * words, the designer owns the box they sit in. Asking a prompt to respect that
 * is not enough — every model drifts back into writing — so the drift is
 * measured here and a failed layout is retried rather than applied.
 *
 * "Identical text" would be the wrong rule. Turning prose into a table drops
 * the glue ("costs", "a year") and adds column headers, and that is the work
 * being asked for. What must not happen is *invention*: a figure the passage
 * never stated, an explanation nobody asked for, or a passage thrown away.
 */

/** Added words a set of headers and labels can honestly account for. */
const MAX_ADDED_RATIO = 0.25;

/** How much of the passage must still be there once it has been arranged. */
const MIN_KEPT_RATIO = 0.5;

export interface LayoutDrift {
  /** Figures in the result that the passage never stated. */
  readonly invented: string[];
  /** Figures the passage stated that the result no longer carries. */
  readonly lost: string[];
  /** Words the result adds, over the words the passage had. */
  readonly addedRatio: number;
  /** Words of the passage still present, over the words it had. */
  readonly keptRatio: number;
}

/**
 * Where a block keeps its words when it has no `content`.
 *
 * A chart and a diagram are atoms: every label, figure and caption they carry
 * lives in their attributes. Reading `content` alone sees nothing there, calls
 * the result a passage thrown away, and refuses every conversion into one —
 * which is exactly what "turn this into a chart" asks for.
 */
const ATOM_WORDS: Record<string, (attrs: Record<string, unknown>) => unknown[]> = {
  chart: (attrs) => [
    attrs.title,
    attrs.caption,
    ...((attrs.categories as unknown[]) ?? []),
    ...(((attrs.series as { label?: unknown; values?: unknown[] }[]) ?? []).flatMap(
      (series) => [series.label, ...(series.values ?? [])],
    )),
  ],
  diagram: (attrs) => [
    attrs.title,
    attrs.caption,
    ...(((attrs.nodes as { label?: unknown; note?: unknown }[]) ?? []).flatMap((node) => [
      node.label,
      node.note,
    ])),
    ...(((attrs.edges as { label?: unknown }[]) ?? []).map((edge) => edge.label)),
    ...(((attrs.groups as { label?: unknown }[]) ?? []).map((group) => group.label)),
  ],
};

/**
 * The text of a node with its structure turned into spaces.
 *
 * `nodeText` concatenates, which is right for a paragraph and wrong here: three
 * table cells would come back as one word, and every table would look like an
 * invention. What separates blocks is what makes them countable.
 */
function spacedText(node: DocumentNode): string {
  if (node.text !== undefined) return node.text;
  const inAttrs = ATOM_WORDS[node.type ?? ""];
  if (inAttrs) {
    return inAttrs(node.attrs ?? {})
      .filter((value) => value !== null && value !== undefined)
      .join(" ");
  }
  const children = node.content;
  return children ? children.map(spacedText).join(" ") : "";
}

function words(nodes: DocumentNode[]): string[] {
  return nodes
    .map(spacedText)
    .join(" ")
    .toLowerCase()
    // A hyphen and an underscore hold a name together. Splitting on them turned
    // `astro-001` into a bare `001` that the passage never stated as a figure,
    // and every drawing full of ids was refused for losing it.
    .split(/[^\p{L}\p{N}%.,\-_]+/u)
    .map((word) => word.replace(/^[.,]+|[.,]+$/g, ""))
    .filter(Boolean);
}

/**
 * A figure, read through the decoration around it: a price written `120k` in
 * the passage and `$120k` in the table is the same figure, and reporting it as
 * invented would fail every prettified price.
 *
 * A figure *begins* with a digit. A word that merely holds one is a name —
 * `k8s`, `v2`, `astro-001` — and a technical drawing is made of them. Counting
 * those meant a diagram, which shortens a label and drops a note by design, was
 * refused for dropping figures nobody had stated; no architecture drawing could
 * be converted, whatever the model answered.
 */
function figures(nodes: DocumentNode[]): Set<string> {
  const found = words(nodes)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+/u, ""))
    .filter((word) => /^\d/.test(word))
    .map((word) => word.replace(/[^\d.,%a-z]/gi, ""));
  return new Set(found.filter(Boolean));
}

function missing(from: Set<string>, inside: Set<string>): string[] {
  return [...from].filter((value) => !inside.has(value));
}

/** What a layout pass did to the passage it was given. */
export function layoutDrift(before: DocumentNode[], after: DocumentNode[]): LayoutDrift {
  const source = words(before);
  const result = words(after);
  const sourceWords = new Set(source);
  const resultWords = new Set(result);

  const kept = source.filter((word) => resultWords.has(word)).length;
  const added = result.filter((word) => !sourceWords.has(word)).length;

  return {
    invented: missing(figures(after), figures(before)),
    lost: missing(figures(before), figures(after)),
    // An empty passage cannot be drifted from; an empty result always has.
    addedRatio: source.length === 0 ? 0 : added / source.length,
    keptRatio: source.length === 0 ? 1 : kept / source.length,
  };
}

/** Whether that pass may be applied, or has to be asked for again. */
export function isFaithfulLayout(drift: LayoutDrift): boolean {
  return (
    drift.invented.length === 0 &&
    drift.lost.length === 0 &&
    drift.addedRatio <= MAX_ADDED_RATIO &&
    drift.keptRatio >= MIN_KEPT_RATIO
  );
}

/**
 * The blocks that exist to present rather than to say. The writer may not reach
 * for them: producing one is the other assistant's whole job, and a writer that
 * lays out is a writer nobody can hold to a tone.
 */
const LAYOUT_KINDS = new Set([
  "table",
  "chart",
  "diagram",
  "statRow",
  "stat",
  "cardGrid",
  "card",
  "timeline",
  "stepList",
  "callout",
  "docCover",
  "tableOfContents",
  "pyramid",
  "imageRow",
  "columnList",
]);

/** Presentation blocks in the result that the passage did not already have. */
export function layoutBlocksIntroduced(
  before: DocumentNode[],
  after: DocumentNode[],
): string[] {
  const had = new Set(before.map((node) => node.type));
  const introduced = after
    .map((node) => node.type ?? "")
    .filter((kind) => LAYOUT_KINDS.has(kind) && !had.has(kind));
  return [...new Set(introduced)];
}

/** Why a layout was refused, in words a retry prompt can quote. */
export function driftMessage(drift: LayoutDrift): string {
  if (drift.invented.length) return `it invented figures the text never stated: ${drift.invented.join(", ")}`;
  if (drift.lost.length) return `it dropped figures the text stated: ${drift.lost.join(", ")}`;
  if (drift.addedRatio > MAX_ADDED_RATIO) return "it wrote new sentences instead of arranging the existing ones";
  return "it threw away most of the text it was given";
}
