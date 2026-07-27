import type { JSONContent } from "@tiptap/core";

/**
 * Semantic HTML rendering of a document.
 *
 * This is the shared substrate of the HTML-flavoured export targets: rich
 * paste into Confluence, Trilium notes, anything that eats a fragment. It emits
 * plain semantic tags only — no classes, no inline styles — because the
 * receiving tool applies its own look, and unknown markup is what those editors
 * throw away on paste.
 *
 * Targets that need their own markup for a block pass a `HtmlDialect` instead
 * of forking the walk: a dialect returns markup for the nodes it cares about
 * and `null` for the rest, which keeps the traversal, the escaping and the
 * inline marks in one place.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

export interface HtmlContext {
  /** Render a list of block nodes. */
  blocks(nodes: JSONContent[] | undefined): string;
  /** Render inline content (text + marks). */
  inline(nodes: JSONContent[] | undefined): string;
  /** Flatten a node to text, marks and structure dropped. */
  text(node: JSONContent): string;
  /** Rewrite a document-relative URL for a reader outside this instance. */
  url(src: string): string;
}

export interface HtmlDialect {
  /** Markup for a node, or `null` to take the default rendering. */
  block?(node: JSONContent, ctx: HtmlContext): string | null;
}

export interface HtmlOptions {
  /** Absolute origin prepended to `/api/uploads/…` sources. Without it the
   * images stay relative and only resolve inside this instance. */
  baseUrl?: string;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/** Callout variants, as the closest standard construct. */
const CALLOUT_LABEL: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warn: "Warning",
  danger: "Caution",
};

function makeContext(dialect: HtmlDialect, options: HtmlOptions): HtmlContext {
  const url = (src: string): string => {
    const base = options.baseUrl?.replace(/\/+$/, "");
    return base && src.startsWith("/") ? `${base}${src}` : src;
  };

  const text = (node: JSONContent): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(text).join(" ").replace(/\s+/g, " ").trim();
  };

  const inline = (nodes: JSONContent[] | undefined): string => {
    if (!nodes) return "";
    return nodes
      .map((node) => {
        if (node.type === "hardBreak") return "<br />";
        if (node.type === "image") return imageTag(node, url);
        if (node.type !== "text") return inline(node.content);

        const marks = node.marks ?? [];
        // A code span takes its text verbatim; no other mark nests inside it.
        if (marks.some((m) => m.type === "code")) {
          return `<code>${escapeHtml(node.text ?? "")}</code>`;
        }

        let out = escapeHtml(node.text ?? "");
        // A badge is a colored pill carrying a status ("Done", "P1"); strong is
        // the only emphasis a foreign editor is sure to keep.
        if (marks.some((m) => m.type === "bold" || m.type === "badge")) {
          out = `<strong>${out}</strong>`;
        }
        if (marks.some((m) => m.type === "italic")) out = `<em>${out}</em>`;
        if (marks.some((m) => m.type === "strike")) out = `<s>${out}</s>`;
        const link = marks.find((m) => m.type === "link");
        if (link?.attrs?.href) {
          out = `<a href="${escapeHtml(String(link.attrs.href))}">${out}</a>`;
        }
        return out;
      })
      .join("");
  };

  const blocks = (nodes: JSONContent[] | undefined): string =>
    (nodes ?? [])
      .map((node) => renderBlock(node, ctx, dialect))
      .filter((html) => html.trim().length > 0)
      .join("\n");

  const ctx: HtmlContext = { blocks, inline, text, url };
  return ctx;
}

function imageTag(node: JSONContent, url: (src: string) => string): string {
  const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
  if (!src) return "";
  return `<img src="${escapeHtml(url(src))}" alt="${escapeHtml(alt ?? "")}" />`;
}

/** Code block text, unescaped by the walk — the caller escapes or wraps it. */
export function rawText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(rawText).join("");
}

function listItems(node: JSONContent, ctx: HtmlContext): string {
  return (node.content ?? [])
    .map((item) => `<li>${ctx.blocks(item.content)}</li>`)
    .join("\n");
}

function tableToHtml(node: JSONContent, ctx: HtmlContext): string {
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

/** A chart carries its data in attrs; the table is that data, losing nothing. */
function chartToHtml(node: JSONContent): string {
  const { title, caption, categories, series } = (node.attrs ?? {}) as {
    title?: string | null;
    caption?: string | null;
    categories?: string[];
    series?: { label: string; values: number[] }[];
  };
  const cats = categories ?? [];
  const head = `<tr><th></th>${cats.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
  const body = (series ?? [])
    .map(
      (s) =>
        `<tr><th>${escapeHtml(s.label)}</th>${cats
          .map((_, i) => `<td>${escapeHtml(String(s.values[i] ?? ""))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return [
    title ? `<p><strong>${escapeHtml(title)}</strong></p>` : "",
    `<table><tbody>${head}${body}</tbody></table>`,
    caption ? `<p><em>${escapeHtml(caption)}</em></p>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** value / label / optional delta, as one list line. */
function statToHtml(node: JSONContent, ctx: HtmlContext): string {
  const [value, label, delta] = (node.content ?? []).map(ctx.text);
  const tail = [label, delta].filter(Boolean).join(" — ");
  return `<li><strong>${escapeHtml(value ?? "")}</strong>${
    tail ? ` — ${escapeHtml(tail)}` : ""
  }</li>`;
}

function defaultBlock(node: JSONContent, ctx: HtmlContext): string {
  switch (node.type) {
    case "heading": {
      const level = HEADING_LEVELS.includes(Number(node.attrs?.level))
        ? Number(node.attrs?.level)
        : 1;
      return `<h${level}>${ctx.inline(node.content)}</h${level}>`;
    }
    case "paragraph": {
      const inner = ctx.inline(node.content);
      return inner ? `<p>${inner}</p>` : "";
    }
    case "bulletList":
      return `<ul>\n${listItems(node, ctx)}\n</ul>`;
    case "orderedList":
      return `<ol>\n${listItems(node, ctx)}\n</ol>`;
    case "blockquote":
      return `<blockquote>${ctx.blocks(node.content)}</blockquote>`;
    case "codeBlock": {
      const language = (node.attrs?.language as string | null) ?? "";
      const cls = language ? ` class="language-${escapeHtml(language)}"` : "";
      return `<pre><code${cls}>${escapeHtml(rawText(node))}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr />";
    case "table":
      return tableToHtml(node, ctx);
    case "image":
      return `<p>${imageTag(node, ctx.url)}</p>`;
    case "callout": {
      const label = CALLOUT_LABEL[String(node.attrs?.variant ?? "note")] ?? "Note";
      return `<blockquote><p><strong>${label}</strong></p>${ctx.blocks(
        node.content,
      )}</blockquote>`;
    }
    case "chart":
      return chartToHtml(node);
    case "statRow":
      return `<ul>\n${(node.content ?? []).map((s) => statToHtml(s, ctx)).join("\n")}\n</ul>`;
    case "docCover":
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
    case "pyramid":
      return `<ul>\n${(node.content ?? [])
        .map((tier) => `<li>${escapeHtml(ctx.text(tier))}</li>`)
        .join("\n")}\n</ul>`;
    case "timeline":
      return `<ul>\n${(node.content ?? [])
        .map((item) => {
          const [when, title, ...rest] = item.content ?? [];
          const head = [ctx.text(when ?? {}), ctx.text(title ?? {})]
            .filter(Boolean)
            .map((t) => `<strong>${escapeHtml(t)}</strong>`)
            .join(" — ");
          const body = rest.map(ctx.text).filter(Boolean).join(" ");
          return `<li>${head}${body ? `: ${escapeHtml(body)}` : ""}</li>`;
        })
        .join("\n")}\n</ul>`;
    case "stepList":
      return `<ol>\n${(node.content ?? [])
        .map((step) => {
          const [title, ...rest] = step.content ?? [];
          const body = rest.map(ctx.text).filter(Boolean).join(" ");
          return `<li><strong>${escapeHtml(ctx.text(title ?? {}))}</strong>${
            body ? ` — ${escapeHtml(body)}` : ""
          }</li>`;
        })
        .join("\n")}\n</ol>`;
    // Layout containers: their children are the content.
    case "cardGrid":
    case "card":
    case "columnList":
    case "column":
      return ctx.blocks(node.content);
    // Presentation only — the receiving tool builds its own, or has none.
    case "tableOfContents":
    case "pageBreak":
      return "";
    default:
      return node.content ? ctx.blocks(node.content) : "";
  }
}

function renderBlock(
  node: JSONContent,
  ctx: HtmlContext,
  dialect: HtmlDialect,
): string {
  const custom = dialect.block?.(node, ctx);
  return custom !== null && custom !== undefined ? custom : defaultBlock(node, ctx);
}

/** The document as an HTML fragment — no `<html>`, no wrapper element. */
export function docToHtml(
  doc: JSONContent,
  dialect: HtmlDialect = {},
  options: HtmlOptions = {},
): string {
  return makeContext(dialect, options).blocks(doc.content);
}
