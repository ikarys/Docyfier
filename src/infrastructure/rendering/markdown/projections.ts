import type { DocumentNode } from "@/domain/documents/body";
import { diagramLines, diagramTexts } from "../diagram-lines";
import { plainText } from "./inline";

/**
 * Blocks markdown has no construct for — charts, stats, timelines, steps,
 * pyramids — projected onto the closest standard one. The layout is lost on
 * purpose; the content never is.
 */

/** A chart carries its data in attrs; the table is that data, losing nothing. */
export function chartToMarkdown(node: DocumentNode): string {
  const { title, caption, categories, series } = (node.attrs ?? {}) as {
    title?: string | null;
    caption?: string | null;
    categories?: string[];
    series?: { label: string; values: number[] }[];
  };
  const cats = categories ?? [];
  const sets = series ?? [];
  const header = ["", ...cats];
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...sets.map(
      (s) => `| **${s.label}** | ${cats.map((_, i) => s.values[i] ?? "").join(" | ")} |`,
    ),
  ];
  return [
    title ? `**${title}**` : null,
    lines.join("\n"),
    caption ? `*${caption}*` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * A diagram as its relations, one per line.
 *
 * Markdown has no drawing to offer, and a picture nobody can read beats
 * nothing far less than the arrows written out do.
 */
export function diagramToMarkdown(node: DocumentNode): string {
  const { title, caption } = diagramTexts(node);
  const lines = diagramLines(node).map((line) => `${"  ".repeat(line.depth)}- ${line.text}`);
  return [title ? `**${title}**` : null, lines.join("\n"), caption ? `*${caption}*` : null]
    .filter((part) => part !== null && part !== "")
    .join("\n\n");
}

/** value / label / optional delta, as one list line. */
function statToMarkdown(node: DocumentNode): string {
  const [value, label, delta] = (node.content ?? []).map(plainText);
  const tail = [label, delta].filter(Boolean).join(" — ");
  return `- **${value ?? ""}**${tail ? ` — ${tail}` : ""}`;
}

export function statRowToMarkdown(node: DocumentNode): string {
  return (node.content ?? []).map(statToMarkdown).join("\n");
}

export function pyramidToMarkdown(node: DocumentNode): string {
  return (node.content ?? []).map((tier) => `- ${plainText(tier)}`).join("\n");
}

export function timelineToMarkdown(node: DocumentNode): string {
  return (node.content ?? [])
    .map((item) => {
      const [when, title, ...rest] = item.content ?? [];
      const head = [plainText(when ?? {}), plainText(title ?? {})]
        .filter(Boolean)
        .map((t) => `**${t}**`)
        .join(" — ");
      const body = rest.map(plainText).filter(Boolean).join(" ");
      return `- ${head}${body ? `: ${body}` : ""}`;
    })
    .join("\n");
}

export function stepListToMarkdown(node: DocumentNode): string {
  return (node.content ?? [])
    .map((step, index) => {
      const [title, ...rest] = step.content ?? [];
      const body = rest.map(plainText).filter(Boolean).join(" ");
      return `${index + 1}. **${plainText(title ?? {})}**${body ? ` — ${body}` : ""}`;
    })
    .join("\n");
}
