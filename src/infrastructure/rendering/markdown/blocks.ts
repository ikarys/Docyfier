import type { DocumentNode } from "@/domain/documents/body";
import { imageToMarkdown, inlineToMarkdown, plainText, plainTextRaw } from "./inline";
import {
  chartToMarkdown,
  diagramToMarkdown,
  pyramidToMarkdown,
  statRowToMarkdown,
  stepListToMarkdown,
  timelineToMarkdown,
} from "./projections";

/**
 * The markdown rendering of every block type, as a table keyed by node type: a
 * new node is one entry, and an unknown one falls back to its children rather
 * than disappearing.
 */

type BlockRenderer = (node: DocumentNode) => string;

const HEADING_HASHES = ["#", "##", "###", "####", "#####", "######"];

/** GitHub alert syntax — the closest thing markdown has to a callout. */
const ALERT_BY_VARIANT: Record<string, string> = {
  note: "NOTE",
  tip: "TIP",
  warn: "WARNING",
  danger: "CAUTION",
};

function prefixLines(block: string, first: string, rest: string): string {
  return block
    .split("\n")
    .map((line, i) => `${i === 0 ? first : rest}${line}`.trimEnd())
    .join("\n");
}

/** A block image may name itself; the inline form has nowhere to put a caption. */
function imageBlockToMarkdown(node: DocumentNode): string {
  const image = imageToMarkdown(node);
  const caption = (node.attrs?.caption as string | null) ?? null;
  return image && caption ? `${image}\n\n*${caption}*` : image;
}

function markedList(node: DocumentNode, marker: (index: number) => string): string {
  return (node.content ?? [])
    .map((item, index) => {
      const bullet = marker(index);
      const body = blocksToMarkdown(item.content ?? []);
      return prefixLines(body, bullet, " ".repeat(bullet.length));
    })
    .join("\n");
}

function tableToMarkdown(node: DocumentNode): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => {
      // A cell can hold several blocks; markdown gives it one line.
      const text = (cell.content ?? [])
        .map((block) =>
          block.type === "paragraph" ? inlineToMarkdown(block.content) : plainText(block),
        )
        .join(" ");
      return text.replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
    }),
  );
  if (!rows.length) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const pad = (row: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => row[i] ?? "").join(" | ")} |`;
  const [header, ...body] = rows;
  return [
    pad(header),
    `| ${Array.from({ length: width }, () => "---").join(" | ")} |`,
    ...body.map(pad),
  ].join("\n");
}

function coverToMarkdown(node: DocumentNode): string {
  // The cover's own heading is the document title; its extra lines are
  // subtitle, chips and meta.
  return (node.content ?? [])
    .map((line) =>
      line.type === "coverLine"
        ? `*${inlineToMarkdown(line.content)}*`
        : blockToMarkdown(line),
    )
    .filter(Boolean)
    .join("\n\n");
}

/** Layout containers: their children are the content. */
const childrenOnly: BlockRenderer = (node) => blocksToMarkdown(node.content ?? []);
/** Presentation only — nothing a markdown reader would miss. */
const nothing: BlockRenderer = () => "";

const BLOCK_RENDERERS: Record<string, BlockRenderer> = {
  heading: (node) => {
    const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
    return `${HEADING_HASHES[level - 1]} ${inlineToMarkdown(node.content)}`;
  },
  paragraph: (node) => inlineToMarkdown(node.content),
  bulletList: (node) => markedList(node, () => "- "),
  taskList: (node) =>
    (node.content ?? [])
      .map(
        (item) =>
          `- [${item.attrs?.checked ? "x" : " "}] ${blocksToMarkdown(item.content ?? [])}`,
      )
      .join("\n"),
  details: (node) => {
    const summary = (node.content ?? []).find((child) => child.type === "detailsSummary");
    const body = (node.content ?? []).filter((child) => child.type !== "detailsSummary");
    // Markdown has no fold: the summary becomes the heading of what it held.
    return [`**${inlineToMarkdown(summary?.content)}**`, blocksToMarkdown(body)]
      .filter(Boolean)
      .join("\n\n");
  },
  detailsContent: childrenOnly,
  orderedList: (node) => markedList(node, (index) => `${index + 1}. `),
  blockquote: (node) => prefixLines(blocksToMarkdown(node.content ?? []), "> ", "> "),
  codeBlock: (node) => {
    const language = (node.attrs?.language as string | null) ?? "";
    return `\`\`\`${language}\n${plainTextRaw(node)}\n\`\`\``;
  },
  horizontalRule: () => "---",
  blockMath: (node) => `$$\n${String(node.attrs?.latex ?? "")}\n$$`,
  table: tableToMarkdown,
  image: imageBlockToMarkdown,
  callout: (node) => {
    const alert = ALERT_BY_VARIANT[String(node.attrs?.variant ?? "note")] ?? "NOTE";
    const body = blocksToMarkdown(node.content ?? []);
    return prefixLines(`[!${alert}]\n${body}`, "> ", "> ");
  },
  chart: chartToMarkdown,
  diagram: diagramToMarkdown,
  statRow: statRowToMarkdown,
  docCover: coverToMarkdown,
  pyramid: pyramidToMarkdown,
  timeline: timelineToMarkdown,
  stepList: stepListToMarkdown,
  cardGrid: childrenOnly,
  card: childrenOnly,
  columnList: childrenOnly,
  column: childrenOnly,
  tableOfContents: nothing,
  pageBreak: nothing,
};

function blockToMarkdown(node: DocumentNode): string {
  const render = BLOCK_RENDERERS[node.type ?? ""];
  if (render) return render(node);
  return node.content ? blocksToMarkdown(node.content) : "";
}

export function blocksToMarkdown(blocks: DocumentNode[]): string {
  return blocks
    .map(blockToMarkdown)
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}
