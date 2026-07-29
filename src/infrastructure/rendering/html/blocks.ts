import type { DocumentNode } from "@/domain/documents/body";
import type { HtmlContext } from "./contract";
import { attachmentLink, embedLink } from "../block-links";
import { escapeHtml } from "./escape";
import { imageTag, rawText } from "./inline";
import {
  chartToHtml,
  diagramToHtml,
  pyramidToHtml,
  statRowToHtml,
  stepListToHtml,
  timelineToHtml,
} from "./projections";

/**
 * The default rendering of every block type, as a table keyed by node type: a
 * new node is one entry, and an unknown one falls back to its children rather
 * than disappearing.
 *
 * Plain semantic tags only — no classes, no inline styles — because the
 * receiving tool applies its own look and throws away markup it does not know.
 */

type BlockRenderer = (node: DocumentNode, ctx: HtmlContext) => string;

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/** Callout variants, as the closest standard construct. */
const CALLOUT_LABEL: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warn: "Warning",
  danger: "Caution",
};

function listItems(node: DocumentNode, ctx: HtmlContext): string {
  return (node.content ?? [])
    .map((item) => `<li>${ctx.blocks(item.content)}</li>`)
    .join("\n");
}

function tableToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const rows = (node.content ?? []).map((row) => {
    const cells = (row.content ?? []).map((cell) => {
      const tag = cell.type === "tableHeader" ? "th" : "td";
      const attrs: string[] = [];
      const colspan = Number(cell.attrs?.colspan ?? 1);
      const rowspan = Number(cell.attrs?.rowspan ?? 1);
      if (colspan > 1) attrs.push(` colspan="${colspan}"`);
      if (rowspan > 1) attrs.push(` rowspan="${rowspan}"`);
      return `<${tag}${attrs.join("")}>${ctx.blocks(cell.content)}</${tag}>`;
    });
    return `<tr>${cells.join("")}</tr>`;
  });
  return rows.length ? `<table><tbody>${rows.join("")}</tbody></table>` : "";
}

/**
 * An image, with its caption when it has one. A figure only then: a bare
 * `<figure>` says nothing a receiving tool can use.
 */
function figureOf(node: DocumentNode, ctx: HtmlContext): string {
  const tag = imageTag(node, ctx.url);
  if (!tag) return "";
  const caption = (node.attrs?.caption as string | null) ?? null;
  return caption ? `<figure>${tag}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : tag;
}

/** On its own, an image still needs a block around it; a paragraph is the one
 * every receiving tool keeps. */
function imageToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const figure = figureOf(node, ctx);
  if (!figure) return "";
  return node.attrs?.caption ? figure : `<p>${figure}</p>`;
}

/** A gallery stays a row in the one layout every reader has: a table. */
function galleryToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const cells = (node.content ?? [])
    .map((image) => `<td>${figureOf(image, ctx)}</td>`)
    .join("");
  return cells ? `<table><tbody><tr>${cells}</tr></tbody></table>` : "";
}

function coverToHtml(node: DocumentNode, ctx: HtmlContext): string {
  // The cover's own heading is the document title; its extra lines are
  // subtitle, chips and meta.
  return (node.content ?? [])
    .map((line) =>
      line.type === "coverLine"
        ? `<p><em>${ctx.inline(line.content)}</em></p>`
        : defaultBlock(line, ctx),
    )
    .filter(Boolean)
    .join("\n");
}

/** Layout containers: their children are the content. */
const childrenOnly: BlockRenderer = (node, ctx) => ctx.blocks(node.content);
/** Presentation only — the receiving tool builds its own, or has none. */
const nothing: BlockRenderer = () => "";

const BLOCK_RENDERERS: Record<string, BlockRenderer> = {
  heading: (node, ctx) => {
    const level = HEADING_LEVELS.includes(Number(node.attrs?.level))
      ? Number(node.attrs?.level)
      : 1;
    return `<h${level}>${ctx.inline(node.content)}</h${level}>`;
  },
  paragraph: (node, ctx) => {
    const inner = ctx.inline(node.content);
    return inner ? `<p>${inner}</p>` : "";
  },
  bulletList: (node, ctx) => `<ul>\n${listItems(node, ctx)}\n</ul>`,
  // A checkbox input would be stripped on the way back in — and by most
  // receiving tools. The box as a character survives every one of them.
  taskList: (node, ctx) =>
    `<ul>\n${(node.content ?? [])
      .map((item) => `<li>${item.attrs?.checked ? "\u2611" : "\u2610"} ${ctx.blocks(item.content).replace(/<\/?p>/g, "")}</li>`)
      .join("\n")}\n</ul>`,
  details: (node, ctx) => {
    const summary = (node.content ?? []).find((child) => child.type === "detailsSummary");
    const body = (node.content ?? []).filter((child) => child.type !== "detailsSummary");
    // Open: an export is read, not clicked.
    return `<details open><summary>${ctx.inline(summary?.content)}</summary>${ctx.blocks(body)}</details>`;
  },
  detailsContent: childrenOnly,
  orderedList: (node, ctx) => `<ol>\n${listItems(node, ctx)}\n</ol>`,
  blockquote: (node, ctx) => `<blockquote>${ctx.blocks(node.content)}</blockquote>`,
  codeBlock: (node) => {
    const language = (node.attrs?.language as string | null) ?? "";
    const cls = language ? ` class="language-${escapeHtml(language)}"` : "";
    return `<pre><code${cls}>${escapeHtml(rawText(node))}</code></pre>`;
  },
  horizontalRule: () => "<hr />",
  // No HTML for maths that survives a paste: the LaTeX source does, and every
  // receiving tool renders or shows it rather than losing it.
  blockMath: (node) => `<p><code>$$${escapeHtml(String(node.attrs?.latex ?? ""))}$$</code></p>`,
  table: tableToHtml,
  image: imageToHtml,
  imageRow: galleryToHtml,
  embed: (node) => {
    const { label, href } = embedLink(node);
    return href ? `<p><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>` : "";
  },
  attachment: (node, ctx) => {
    const { label, href } = attachmentLink(node);
    return href ? `<p><a href="${escapeHtml(ctx.url(href))}">${escapeHtml(label)}</a></p>` : "";
  },
  callout: (node, ctx) => {
    const label = CALLOUT_LABEL[String(node.attrs?.variant ?? "note")] ?? "Note";
    return `<blockquote><p><strong>${label}</strong></p>${ctx.blocks(
      node.content,
    )}</blockquote>`;
  },
  chart: chartToHtml,
  diagram: diagramToHtml,
  statRow: statRowToHtml,
  docCover: coverToHtml,
  pyramid: pyramidToHtml,
  timeline: timelineToHtml,
  stepList: stepListToHtml,
  cardGrid: childrenOnly,
  card: childrenOnly,
  columnList: childrenOnly,
  column: childrenOnly,
  tableOfContents: nothing,
  pageBreak: nothing,
};

export function defaultBlock(node: DocumentNode, ctx: HtmlContext): string {
  const render = BLOCK_RENDERERS[node.type ?? ""];
  if (render) return render(node, ctx);
  return node.content ? ctx.blocks(node.content) : "";
}
