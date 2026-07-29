import type { DocumentNode } from "@/domain/documents/body";
import { diagramLines, diagramTexts } from "./diagram-lines";

/**
 * Jira classic wiki markup — what Jira's description field understands.
 *
 * Written for the ticket composer (PLAN.md STEP 8): the model writes Markdown,
 * this turns it into the markup the destination expects. Its block set is
 * therefore the one a Markdown source can produce; the rich presentation nodes
 * fall through to their children rather than being modelled, which loses the
 * layout and keeps the content.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

/**
 * Jira reads `[`, `{` and `-` as markup. Escaping them keeps a bracketed
 * placeholder such as `[date]` readable instead of rendering as a broken link.
 */
function escapeInline(text: string): string {
  return text.replace(/([[\]{}])/g, "\\$1");
}

function inlineToJira(nodes: DocumentNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "\n";
      if (node.type === "image") {
        const src = (node.attrs ?? {}).src as string | undefined;
        return src ? `!${src}!` : "";
      }
      if (node.type !== "text") return inlineToJira(node.content);

      const marks = node.marks ?? [];
      // Monospace takes its text verbatim; no other mark nests inside it.
      if (marks.some((m) => m.type === "code")) return `{{${node.text ?? ""}}}`;

      let out = escapeInline(node.text ?? "");
      // A badge is a colored pill carrying a status; bold is its closest match.
      if (marks.some((m) => m.type === "bold" || m.type === "badge")) out = `*${out}*`;
      if (marks.some((m) => m.type === "italic")) out = `_${out}_`;
      if (marks.some((m) => m.type === "strike")) out = `-${out}-`;
      const link = marks.find((m) => m.type === "link");
      if (link?.attrs?.href) out = `[${out}|${link.attrs.href}]`;
      return out;
    })
    .join("");
}

/** Text of a node, marks and structure flattened. */
function plainText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join(" ").replace(/\s+/g, " ").trim();
}

/** Code block text, unescaped — a {code} block takes its content verbatim. */
function rawText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(rawText).join("");
}

/**
 * Jira nests a list by repeating its marker rather than by indenting, so a
 * nested list needs the markers of every level above it.
 */
function listToJira(node: DocumentNode, marker: string, prefix: string): string {
  const level = prefix + marker;
  return (node.content ?? [])
    .map((item) => {
      const [first, ...rest] = item.content ?? [];
      const head = first ? `${level} ${blockToJira(first, level)}` : level;
      const tail = rest.map((block) => blockToJira(block, level)).filter(Boolean);
      return [head, ...tail].join("\n");
    })
    .join("\n");
}

function tableToJira(node: DocumentNode): string {
  return (node.content ?? [])
    .map((row) => {
      const cells = (row.content ?? []).map((cell) =>
        (cell.content ?? [])
          .map((block) =>
            block.type === "paragraph" ? inlineToJira(block.content) : plainText(block),
          )
          .join(" ")
          .replace(/\|/g, "\\|")
          .replace(/\n/g, " ")
          .trim(),
      );
      const header = (row.content ?? []).every((cell) => cell.type === "tableHeader");
      const bar = header ? "||" : "|";
      return `${bar}${cells.join(bar)}${bar}`;
    })
    .join("\n");
}

/** `prefix` carries the list markers a nested block sits under, empty at top level. */
function blockToJira(node: DocumentNode, prefix = ""): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `h${level}. ${inlineToJira(node.content)}`;
    }
    case "paragraph":
      return inlineToJira(node.content);
    case "bulletList":
      return listToJira(node, "*", prefix);
    case "orderedList":
      return listToJira(node, "#", prefix);
    case "blockquote":
      return `{quote}\n${blocksToJira(node.content ?? [])}\n{quote}`;
    case "codeBlock": {
      const language = (node.attrs?.language as string | null) ?? "";
      return `{code${language ? `:${language}` : ""}}\n${rawText(node)}\n{code}`;
    }
    case "horizontalRule":
      return "----";
    case "table":
      return tableToJira(node);
    case "image": {
      const { src, caption } = (node.attrs ?? {}) as { src?: string; caption?: string | null };
      if (!src) return "";
      return caption ? `!${src}!\n_${caption}_` : `!${src}!`;
    }
    case "callout": {
      const variant = String(node.attrs?.variant ?? "note").toUpperCase();
      return `{panel:title=${variant}}\n${blocksToJira(node.content ?? [])}\n{panel}`;
    }
    case "diagram":
      return diagramToJira(node);
    default:
      return node.content ? blocksToJira(node.content, prefix) : "";
  }
}

/**
 * A diagram as its relations, bulleted.
 *
 * Jira renders no drawing of ours, and an empty block is what a diagram used to
 * come out as — an atom has no children for the default branch to fall into.
 */
function diagramToJira(node: DocumentNode): string {
  const { title, caption } = diagramTexts(node);
  const lines = diagramLines(node).map((line) => `${"*".repeat(line.depth + 1)} ${line.text}`);
  return [title ? `*${escapeInline(title)}*` : null, ...lines, caption ? `_${caption}_` : null]
    .filter((part) => part !== null)
    .join("\n");
}

function blocksToJira(blocks: DocumentNode[], prefix = ""): string {
  return blocks
    .map((block) => blockToJira(block, prefix))
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

/** The document as Jira wiki markup. */
export function docToJira(doc: DocumentNode): string {
  return blocksToJira(doc.content ?? []);
}
