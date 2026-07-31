import type { DocumentNode } from "@/domain/documents/body";

/**
 * The `::: name {attrs}` vocabulary, declared once for the emitter and the
 * parser — a directive spelled one way here and another way there is the bug
 * this file exists to make impossible.
 *
 * `:::` rather than a syntax of our own: models have read it millions of times,
 * and a bespoke delimiter reopens the problem markdown was chosen to solve. The
 * directive name is always the node type, with no aliases and no implicit
 * nodes, so the contract shown to a model is the schema it will be checked
 * against.
 */

export const FENCE = ":::";

/** What sits between a directive's opening line and its `:::`. */
export type DirectiveBody =
  /** Blocks, read the same way as the top level. */
  | "blocks"
  /** Inline content only: text and marks. */
  | "inline"
  /** Text nothing else may interpret — the escape hatch's payload. */
  | "raw"
  /** Nothing: the node is its attributes. It still closes, like every other. */
  | "none";

/**
 * The block a rule cannot write travels as its own JSON rather than being
 * dropped. Rare by construction — it is what keeps "lossless" true without a
 * private syntax for every attribute the editor happens to store.
 */
export const JSON_DIRECTIVE = "json";

const BODIES: Record<string, DirectiveBody> = {
  // Markdown writes these two itself; the directive is what carries the one a
  // heading or a paragraph is centred, which markdown has no syntax for. The
  // words stay words that way, instead of a whole sentence becoming JSON.
  paragraph: "inline",
  heading: "inline",
  callout: "blocks",
  cardGrid: "blocks",
  card: "blocks",
  columnList: "blocks",
  column: "blocks",
  statRow: "blocks",
  stat: "blocks",
  timeline: "blocks",
  timelineItem: "blocks",
  stepList: "blocks",
  step: "blocks",
  pyramid: "blocks",
  pyramidTier: "blocks",
  docCover: "blocks",
  coverLine: "inline",
  details: "blocks",
  detailsSummary: "inline",
  detailsContent: "blocks",
  imageRow: "blocks",
  image: "none",
  chart: "none",
  diagram: "none",
  embed: "none",
  attachment: "none",
  pageBreak: "none",
  tableOfContents: "none",
  [JSON_DIRECTIVE]: "raw",
};

/** How this node type travels, or null when markdown has a syntax for it. */
export function directiveBody(type: string | undefined): DirectiveBody | null {
  return BODIES[type ?? ""] ?? null;
}

/**
 * The attributes markdown has no syntax for, each with the value that means
 * the writer never set one.
 *
 * A block carrying anything else here cannot be written as markdown without
 * losing it, so it travels as JSON instead. Only the attributes markdown
 * *cannot* express are listed: a heading's level and a code block's language
 * are written by the syntax itself.
 */
const BEYOND_MARKDOWN: Record<string, Record<string, unknown>> = {
  paragraph: { textAlign: null },
  heading: { textAlign: null },
  orderedList: { type: null },
  tableHeader: { colspan: 1, rowspan: 1, colwidth: null },
  tableCell: { colspan: 1, rowspan: 1, colwidth: null },
};

/** Whether markdown can carry this node's attributes without dropping one. */
export function markdownCarries(node: DocumentNode): boolean {
  const beyond = BEYOND_MARKDOWN[node.type ?? ""];
  if (!beyond) return true;
  return Object.entries(beyond).every(([attr, unset]) => {
    const value = node.attrs?.[attr];
    return value === undefined || value === unset;
  });
}
