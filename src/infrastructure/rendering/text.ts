import type { DocumentNode } from "@/domain/documents/body";
import { diagramLines, diagramTexts } from "./diagram-lines";

/**
 * A document as plain text, for destinations that render no markup at all —
 * a ServiceNow form field, the fallback flavour of a clipboard payload.
 *
 * Structure survives as layout rather than as syntax: a heading becomes an
 * uppercase label on its own line, a list keeps its markers, a code block is
 * indented. Nothing emits an asterisk or a backtick, since nothing would
 * interpret it.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

/** Inline content with every mark dropped. */
function inlineToText(nodes: DocumentNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      if (node.type !== "text") return inlineToText(node.content);
      const link = (node.marks ?? []).find((m) => m.type === "link");
      const text = node.text ?? "";
      // A bare URL is the only way a link survives with nowhere to hang.
      return link?.attrs?.href && link.attrs.href !== text
        ? `${text} (${link.attrs.href})`
        : text;
    })
    .join("");
}

function rawText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(rawText).join("");
}

function indent(block: string, first: string, rest: string): string {
  return block
    .split("\n")
    .map((line, i) => `${i === 0 ? first : rest}${line}`.trimEnd())
    .join("\n");
}

function listToText(node: DocumentNode, ordered: boolean): string {
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : "- ";
      return indent(blocksToText(item.content ?? []), marker, " ".repeat(marker.length));
    })
    .join("\n");
}

function tableToText(node: DocumentNode): string {
  return (node.content ?? [])
    .map((row) =>
      (row.content ?? [])
        .map((cell) =>
          (cell.content ?? [])
            .map((block) => inlineToText(block.content))
            .join(" ")
            .trim(),
        )
        .join("  |  "),
    )
    .join("\n");
}

function blockToText(node: DocumentNode): string {
  switch (node.type) {
    // A label, the way a form field with no markup gets a section.
    case "heading": {
      const label = inlineToText(node.content).toUpperCase().trim();
      return label.endsWith(":") ? label : `${label}:`;
    }
    case "paragraph":
      return inlineToText(node.content);
    case "bulletList":
      return listToText(node, false);
    case "orderedList":
      return listToText(node, true);
    case "blockquote":
      return indent(blocksToText(node.content ?? []), "  ", "  ");
    case "codeBlock":
      return indent(rawText(node), "    ", "    ");
    case "horizontalRule":
      return "---";
    case "table":
      return tableToText(node);
    case "callout":
      return blocksToText(node.content ?? []);
    case "diagram":
      return diagramToText(node);
    case "image":
      return "";
    default:
      return node.content ? blocksToText(node.content) : "";
  }
}

/**
 * A diagram as its relations, indented.
 *
 * Plain text renders no drawing, and an atom has no children for the default
 * branch to fall into — so without this a diagram left nothing behind at all.
 */
function diagramToText(node: DocumentNode): string {
  const { title, caption } = diagramTexts(node);
  const lines = diagramLines(node).map((line) => `${"  ".repeat(line.depth)}- ${line.text}`);
  return [title, ...lines, caption].filter((part) => part !== null && part !== "").join("\n");
}

function blocksToText(blocks: DocumentNode[]): string {
  return blocks
    .map(blockToText)
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

/** The document as plain text. */
export function docToText(doc: DocumentNode): string {
  return blocksToText(doc.content ?? []);
}
