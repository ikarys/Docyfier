import type { DocumentBody, DocumentMark, DocumentNode } from "@/domain/documents/body";

/**
 * The vocabulary a template is written in.
 *
 * Templates are documents, and a document is a tree of nodes — spelling that
 * tree out by hand buries the intent under braces. These builders name each
 * block the product names it, so a template file reads like the document it
 * produces and the node shapes stay in one place when the editor schema moves.
 */

export function text(value: string, marks?: DocumentMark[]): DocumentNode {
  return marks ? { type: "text", text: value, marks } : { type: "text", text: value };
}

/** A short coloured label — a status, a state, a tag — inside a line of text. */
export function badge(value: string, variant: string): DocumentNode {
  return text(value, [{ type: "badge", attrs: { variant } }]);
}

export function p(...inline: (string | DocumentNode)[]): DocumentNode {
  return {
    type: "paragraph",
    content: inline.map((i) => (typeof i === "string" ? text(i) : i)),
  };
}

export function h(level: 1 | 2 | 3, value: string): DocumentNode {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

export function cover(title: string, subtitle: string, meta: string): DocumentNode {
  return {
    type: "docCover",
    content: [
      h(1, title),
      { type: "coverLine", attrs: { variant: "subtitle" }, content: [text(subtitle)] },
      { type: "coverLine", attrs: { variant: "meta" }, content: [text(meta)] },
    ],
  };
}

export function bullets(...items: string[]): DocumentNode {
  return { type: "bulletList", content: items.map(listItem) };
}

export function numbered(...items: string[]): DocumentNode {
  return { type: "orderedList", content: items.map(listItem) };
}

function listItem(item: string): DocumentNode {
  return { type: "listItem", content: [p(item)] };
}

export function callout(variant: string, ...blocks: DocumentNode[]): DocumentNode {
  return { type: "callout", attrs: { variant }, content: blocks };
}

export interface StatSpec {
  value: string;
  label: string;
  delta?: string;
  accent?: string;
  trend?: string;
  icon?: string;
}

export function statRow(layout: "grid" | "row", ...stats: StatSpec[]): DocumentNode {
  return {
    type: "statRow",
    content: stats.map((s) => ({
      type: "stat",
      attrs: {
        accent: s.accent ?? "blue",
        trend: s.trend ?? "flat",
        layout,
        ...(s.icon ? { icon: s.icon } : {}),
      },
      content: [p(s.value), p(s.label), ...(s.delta ? [p(s.delta)] : [])],
    })),
  };
}

export interface CardSpec {
  title: string;
  body: string;
  accent?: string;
  icon?: string;
}

export function cardGrid(...cards: CardSpec[]): DocumentNode {
  return {
    type: "cardGrid",
    attrs: { cols: cards.length },
    content: cards.map((c) => ({
      type: "card",
      attrs: { accent: c.accent ?? "none", ...(c.icon ? { icon: c.icon } : {}) },
      content: [h(3, c.title), p(c.body)],
    })),
  };
}

export interface TimelineSpec {
  when: string;
  title: string;
  body: string;
  accent?: string;
}

export function timeline(...items: TimelineSpec[]): DocumentNode {
  return {
    type: "timeline",
    content: items.map((i) => ({
      type: "timelineItem",
      attrs: { accent: i.accent ?? "blue" },
      content: [p(i.when), h(3, i.title), p(i.body)],
    })),
  };
}

export interface StepSpec {
  title: string;
  body: string;
  accent?: string;
}

export function steps(...items: StepSpec[]): DocumentNode {
  return {
    type: "stepList",
    content: items.map((s) => ({
      type: "step",
      attrs: { accent: s.accent ?? "blue" },
      content: [h(3, s.title), p(s.body)],
    })),
  };
}

export function columns(...blocks: DocumentNode[][]): DocumentNode {
  return {
    type: "columnList",
    content: blocks.map((content) => ({ type: "column", content })),
  };
}

/** First row is the header; every row must hold the same number of cells. */
export function table(
  header: string[],
  ...rows: (string | DocumentNode)[][]
): DocumentNode {
  return {
    type: "table",
    content: [
      { type: "tableRow", content: header.map((c) => cell("tableHeader", c)) },
      ...rows.map((row) => ({
        type: "tableRow",
        content: row.map((c) => cell("tableCell", c)),
      })),
    ],
  };
}

function cell(type: string, value: string | DocumentNode): DocumentNode {
  return {
    type,
    content: [typeof value === "string" ? p(value) : { type: "paragraph", content: [value] }],
  };
}

export function code(language: string, source: string): DocumentNode {
  return { type: "codeBlock", attrs: { language }, content: [text(source)] };
}

export function doc(...blocks: DocumentNode[]): DocumentBody {
  return { type: "doc", content: blocks };
}
