import type { DocumentNode } from "@/domain/documents/body";

/**
 * Markdown export (PLAN.md STEP 3).
 *
 * Markdown has no cards, stats, timelines or charts, so the rich blocks are
 * projected onto the closest standard construct — a chart becomes the table of
 * its own data, a statRow a list of figures — and never dropped: the content
 * survives the export even when the layout cannot. Presentation-only nodes
 * (cover chrome, table of contents, page breaks) are the exception; they carry
 * nothing a reader would miss in a text file.
 *
 * Pure and client-safe: same input → same output, no server dependency.
 */

const HEADING_HASHES = ["#", "##", "###", "####", "#####", "######"];

/** GitHub alert syntax — the closest thing markdown has to a callout. */
const ALERT_BY_VARIANT: Record<string, string> = {
  note: "NOTE",
  tip: "TIP",
  warn: "WARNING",
  danger: "CAUTION",
};

function escapeInline(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

/** Inline content (text + marks) as markdown. */
function inlineToMarkdown(nodes: DocumentNode[] | undefined): string {
  if (!nodes) return "";
  return nodes
    .map((node) => {
      if (node.type === "hardBreak") return "  \n";
      if (node.type === "image") {
        const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
        return src ? `![${alt ?? ""}](${src})` : "";
      }
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
    })
    .join("");
}

/** Plain text of a node, marks and structure flattened. */
function plainText(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainText).join(" ").replace(/\s+/g, " ").trim();
}

function prefixLines(block: string, first: string, rest: string): string {
  return block
    .split("\n")
    .map((line, i) => `${i === 0 ? first : rest}${line}`.trimEnd())
    .join("\n");
}

function listToMarkdown(node: DocumentNode, ordered: boolean): string {
  return (node.content ?? [])
    .map((item, index) => {
      const marker = ordered ? `${index + 1}. ` : "- ";
      const body = blocksToMarkdown(item.content ?? []);
      return prefixLines(body, marker, " ".repeat(marker.length));
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

/** A chart carries its data in attrs; the table is that data, losing nothing. */
function chartToMarkdown(node: DocumentNode): string {
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

/** value / label / optional delta, as one list line. */
function statToMarkdown(node: DocumentNode): string {
  const [value, label, delta] = (node.content ?? []).map(plainText);
  const tail = [label, delta].filter(Boolean).join(" — ");
  return `- **${value ?? ""}**${tail ? ` — ${tail}` : ""}`;
}

function blockToMarkdown(node: DocumentNode): string {
  switch (node.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
      return `${HEADING_HASHES[level - 1]} ${inlineToMarkdown(node.content)}`;
    }
    case "paragraph":
      return inlineToMarkdown(node.content);
    case "bulletList":
      return listToMarkdown(node, false);
    case "orderedList":
      return listToMarkdown(node, true);
    case "blockquote":
      return prefixLines(blocksToMarkdown(node.content ?? []), "> ", "> ");
    case "codeBlock": {
      const language = (node.attrs?.language as string | null) ?? "";
      return `\`\`\`${language}\n${plainTextRaw(node)}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "table":
      return tableToMarkdown(node);
    case "image": {
      const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
      return src ? `![${alt ?? ""}](${src})` : "";
    }
    case "callout": {
      const alert = ALERT_BY_VARIANT[String(node.attrs?.variant ?? "note")] ?? "NOTE";
      const body = blocksToMarkdown(node.content ?? []);
      return prefixLines(`[!${alert}]\n${body}`, "> ", "> ");
    }
    case "chart":
      return chartToMarkdown(node);
    case "statRow":
      return (node.content ?? []).map(statToMarkdown).join("\n");
    case "docCover": {
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
    case "pyramid":
      return (node.content ?? [])
        .map((tier) => `- ${plainText(tier)}`)
        .join("\n");
    case "timeline":
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
    case "stepList":
      return (node.content ?? [])
        .map((step, index) => {
          const [title, ...rest] = step.content ?? [];
          const body = rest.map(plainText).filter(Boolean).join(" ");
          return `${index + 1}. **${plainText(title ?? {})}**${body ? ` — ${body}` : ""}`;
        })
        .join("\n");
    // Layout containers: their children are the content.
    case "cardGrid":
    case "card":
    case "columnList":
    case "column":
      return blocksToMarkdown(node.content ?? []);
    // Presentation only — nothing a markdown reader would miss.
    case "tableOfContents":
    case "pageBreak":
      return "";
    default:
      return node.content ? blocksToMarkdown(node.content) : "";
  }
}

/** Code block text, unescaped — a fence takes its content verbatim. */
function plainTextRaw(node: DocumentNode): string {
  if (node.type === "text") return node.text ?? "";
  return (node.content ?? []).map(plainTextRaw).join("");
}

function blocksToMarkdown(blocks: DocumentNode[]): string {
  return blocks
    .map(blockToMarkdown)
    .filter((block) => block.trim().length > 0)
    .join("\n\n");
}

/** The document as markdown, ending with a single newline. */
export function docToMarkdown(doc: DocumentNode): string {
  return `${blocksToMarkdown(doc.content ?? [])}\n`;
}

/** A safe `.md` filename for a document title. */
export function markdownFilename(title: string): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "document";
  return `${base}.md`;
}
