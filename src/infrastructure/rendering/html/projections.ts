import type { DocumentNode } from "@/domain/documents/body";
import type { HtmlContext } from "./contract";
import { escapeHtml } from "./escape";

/**
 * Blocks plain HTML has no element for — charts, stats, timelines, steps,
 * pyramids — projected onto the closest standard construct. The layout is lost
 * on purpose; the content never is.
 */

/** A chart carries its data in attrs; the table is that data, losing nothing. */
export function chartToHtml(node: DocumentNode): string {
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
function statToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const [value, label, delta] = (node.content ?? []).map(ctx.text);
  const tail = [label, delta].filter(Boolean).join(" — ");
  return `<li><strong>${escapeHtml(value ?? "")}</strong>${
    tail ? ` — ${escapeHtml(tail)}` : ""
  }</li>`;
}

export function statRowToHtml(node: DocumentNode, ctx: HtmlContext): string {
  return `<ul>\n${(node.content ?? []).map((s) => statToHtml(s, ctx)).join("\n")}\n</ul>`;
}

export function pyramidToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const tiers = (node.content ?? [])
    .map((tier) => `<li>${escapeHtml(ctx.text(tier))}</li>`)
    .join("\n");
  return `<ul>\n${tiers}\n</ul>`;
}

export function timelineToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const items = (node.content ?? [])
    .map((item) => {
      const [when, title, ...rest] = item.content ?? [];
      const head = [ctx.text(when ?? {}), ctx.text(title ?? {})]
        .filter(Boolean)
        .map((t) => `<strong>${escapeHtml(t)}</strong>`)
        .join(" — ");
      const body = rest.map(ctx.text).filter(Boolean).join(" ");
      return `<li>${head}${body ? `: ${escapeHtml(body)}` : ""}</li>`;
    })
    .join("\n");
  return `<ul>\n${items}\n</ul>`;
}

export function stepListToHtml(node: DocumentNode, ctx: HtmlContext): string {
  const steps = (node.content ?? [])
    .map((step) => {
      const [title, ...rest] = step.content ?? [];
      const body = rest.map(ctx.text).filter(Boolean).join(" ");
      return `<li><strong>${escapeHtml(ctx.text(title ?? {}))}</strong>${
        body ? ` — ${escapeHtml(body)}` : ""
      }</li>`;
    })
    .join("\n");
  return `<ol>\n${steps}\n</ol>`;
}
