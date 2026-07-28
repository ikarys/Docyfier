import type { DocumentNode } from "@/domain/documents/body";
import type { HtmlContext } from "./contract";
import { escapeHtml } from "./escape";

/**
 * Inline content: text, marks, images, and the two ways a node is flattened to
 * bare text — normalized for a label, verbatim for a code fence.
 */

export function imageTag(node: DocumentNode, url: (src: string) => string): string {
  const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
  if (!src) return "";
  return `<img src="${escapeHtml(url(src))}" alt="${escapeHtml(alt ?? "")}" />`;
}

/** Flatten a node to a single line of text; marks and structure dropped. */
export function flattenText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? [])
    .map(flattenText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Code block text, unescaped by the walk — the caller escapes or wraps it. */
export function rawText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(rawText).join("");
}

export function renderInline(
  nodes: DocumentNode[] | undefined,
  ctx: HtmlContext,
): string {
  if (!nodes) return "";
  return nodes.map((node) => renderNode(node, ctx)).join("");
}

function renderNode(node: DocumentNode, ctx: HtmlContext): string {
  if (node.type === "hardBreak") return "<br />";
  if (node.type === "image") return imageTag(node, ctx.url);
  if (node.type === "inlineMath") {
    return `<code>$${escapeHtml(String(node.attrs?.latex ?? ""))}$</code>`;
  }
  if (node.type !== "text") return ctx.inline(node.content);

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
  if (marks.some((m) => m.type === "subscript")) out = `<sub>${out}</sub>`;
  if (marks.some((m) => m.type === "superscript")) out = `<sup>${out}</sup>`;
  const link = marks.find((m) => m.type === "link");
  if (link?.attrs?.href) {
    out = `<a href="${escapeHtml(String(link.attrs.href))}">${out}</a>`;
  }
  return out;
}
