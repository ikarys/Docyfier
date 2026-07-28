import type { DocumentNode } from "@/domain/documents/body";

/**
 * Inline content: text, marks, images, and the two ways a node is flattened to
 * bare text — normalized for a label, verbatim for a code fence.
 */

function escapeInline(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

/** Inline content (text + marks) as markdown. */
export function inlineToMarkdown(nodes: DocumentNode[] | undefined): string {
  if (!nodes) return "";
  return nodes.map(nodeToMarkdown).join("");
}

function nodeToMarkdown(node: DocumentNode): string {
  if (node.type === "hardBreak") return "  \n";
  if (node.type === "image") return imageToMarkdown(node);
  if (node.type !== "text") return inlineToMarkdown(node.content);

  const marks = node.marks ?? [];
  // A code span takes the text verbatim; no other mark can nest inside it.
  if (marks.some((m) => m.type === "code")) return `\`${node.text ?? ""}\``;

  let out = escapeInline(node.text ?? "");
  // A badge is a colored pill carrying a status ("Done", "P1"); bold is the
  // only emphasis markdown offers for it.
  if (marks.some((m) => m.type === "bold" || m.type === "badge")) out = `**${out}**`;
  if (marks.some((m) => m.type === "italic")) out = `*${out}*`;
  if (marks.some((m) => m.type === "strike")) out = `~~${out}~~`;
  const link = marks.find((m) => m.type === "link");
  if (link?.attrs?.href) out = `[${out}](${link.attrs.href})`;
  return out;
}

export function imageToMarkdown(node: DocumentNode): string {
  const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
  return src ? `![${alt ?? ""}](${src})` : "";
}

/** Plain text of a node, marks and structure flattened. */
export function plainText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join(" ").replace(/\s+/g, " ").trim();
}

/** Code block text, unescaped — a fence takes its content verbatim. */
export function plainTextRaw(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainTextRaw).join("");
}
