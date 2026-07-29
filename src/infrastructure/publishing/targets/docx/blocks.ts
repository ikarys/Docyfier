import type { DocumentNode } from "@/domain/documents/body";
import type { DiagramImages } from "../../diagram-images";
import type {
  Paragraph as ParagraphType,
  Table as TableType,
  TableOfContents as TableOfContentsType,
} from "docx";
import { figureBuilder } from "./figures";
import { runBuilder, CODE_FILL, MONO, type DocxModule } from "./runs";
import { tableBuilder } from "./tables";

/**
 * The walk from document blocks to Word's own children.
 *
 * Word is built from paragraphs, tables and a live table of contents — nothing
 * else. Every block this app renders is projected onto one of the three, and a
 * block with no equivalent falls through to its own children rather than
 * disappearing.
 */

export type BlockChild = ParagraphType | TableType | TableOfContentsType;

/** Numbering definition referenced by every ordered list in the document. */
export const ORDERED_REFERENCE = "docyfier-ordered";

const HEADING_BY_LEVEL = [
  "Heading1",
  "Heading2",
  "Heading3",
  "Heading4",
  "Heading5",
  "Heading6",
] as const;

/** One indent step, in twips — Word's own list indent. */
const INDENT_STEP = 720;

export function blockBuilder(d: DocxModule, baseUrl: string, images: DiagramImages = new Map()) {
  const runs = runBuilder(d, baseUrl);
  const { text, rawText, inline, paragraph, plain } = runs;
  const figures = figureBuilder(d, runs, images);
  const tables = tableBuilder(d, runs, (nodes) => blocks(nodes) as (ParagraphType | TableType)[]);

  /** List items, flattened: Word carries the nesting on each paragraph. */
  const list = (node: DocumentNode, ordered: boolean, level: number): BlockChild[] =>
    (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child, index) => {
        if (child.type === "bulletList") return list(child, false, level + 1);
        if (child.type === "orderedList") return list(child, true, level + 1);
        // Only the first paragraph of an item carries the marker; the rest are
        // continuation lines at the same indent.
        const marker =
          index > 0
            ? { indent: { left: INDENT_STEP * (level + 1) } }
            : ordered
              ? { numbering: { reference: ORDERED_REFERENCE, level } }
              : { bullet: { level } };
        return child.type === "paragraph"
          ? [paragraph(child.content, marker)]
          : blocks([child]);
      }),
    );

  /** A bold lead followed by the rest of the line — how timelines, steps and
   * stat cards all read once the layout is gone. `tail` carries its own
   * separator, since each of the three reads differently. */
  const lede = (head: string, tail: string, marker: object): ParagraphType =>
    new d.Paragraph({
      ...marker,
      children: [
        new d.TextRun({ text: head, bold: true }),
        ...(tail ? [new d.TextRun({ text: tail })] : []),
      ],
    });

  function block(node: DocumentNode): BlockChild[] {
    switch (node.type) {
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
        return [paragraph(node.content, { heading: HEADING_BY_LEVEL[level - 1] })];
      }
      case "paragraph":
        return [paragraph(node.content)];
      case "bulletList":
        return list(node, false, 0);
      case "taskList":
        // Word has no checkbox in a body paragraph: the box is the character,
        // which prints and reads the same everywhere. Only the first paragraph
        // of an item carries it; the rest are continuation lines.
        return (node.content ?? []).flatMap((item) =>
          (item.content ?? []).map((child, index) =>
            index === 0
              ? paragraph(
                  [
                    { type: "text", text: item.attrs?.checked ? "☑ " : "☐ " },
                    ...(child.content ?? []),
                  ],
                  { indent: { left: INDENT_STEP } },
                )
              : paragraph(child.content, { indent: { left: INDENT_STEP } }),
          ),
        );
      case "details":
        // Nothing folds in a document that is printed: the summary becomes the
        // lead line of what it held.
        return (node.content ?? []).flatMap((child) =>
          child.type === "detailsSummary"
            ? [paragraph(child.content, { heading: HEADING_BY_LEVEL[2] })]
            : blocks(child.content ?? []),
        );
      case "orderedList":
        return list(node, true, 0);
      case "blockquote":
        // Word has no quote container: the rule and the indent are what makes a
        // run of paragraphs read as quoted.
        return (node.content ?? []).map(
          (child) =>
            new d.Paragraph({
              children: inline(child.content),
              indent: { left: 480 },
              border: {
                left: { style: d.BorderStyle.SINGLE, size: 12, color: "D1D5DB", space: 12 },
              },
            }),
        );
      case "codeBlock":
        // One paragraph per line: a single run with newlines collapses in Word.
        return rawText(node)
          .split("\n")
          .map(
            (line) =>
              new d.Paragraph({
                children: [new d.TextRun({ text: line || " ", font: MONO })],
                shading: { fill: CODE_FILL },
              }),
          );
      case "horizontalRule":
        return [
          new d.Paragraph({
            children: [],
            border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: "D1D5DB" } },
          }),
        ];
      case "table":
        return [tables.table(node)];
      case "image":
        return figures.image(node);
      case "imageRow":
        return [figures.gallery(node)];
      case "embed":
        return figures.embed(node);
      case "callout":
        return [tables.callout(node)];
      case "chart":
        return tables.chart(node);
      case "diagram":
        return figures.diagram(node);
      case "statRow":
        return (node.content ?? []).map((stat) => {
          const [value, label, delta] = (stat.content ?? []).map(text);
          const tail = [label, delta].filter(Boolean).join(" — ");
          return lede(value ?? "", tail && ` — ${tail}`, { bullet: { level: 0 } });
        });
      case "docCover":
        // The cover's own heading is the document title; its extra lines are
        // subtitle, chips and meta.
        return (node.content ?? []).flatMap((line) =>
          line.type === "coverLine"
            ? [new d.Paragraph({ children: [new d.TextRun({ text: text(line), italics: true })] })]
            : block(line),
        );
      case "pyramid":
        return (node.content ?? []).map((tier) => plain(text(tier), { bullet: { level: 0 } }));
      case "timeline":
        return (node.content ?? []).map((item) => {
          const [when, title, ...rest] = item.content ?? [];
          const head = [text(when ?? {}), text(title ?? {})].filter(Boolean).join(" — ");
          const body = rest.map(text).filter(Boolean).join(" ");
          return lede(head, body && `: ${body}`, { bullet: { level: 0 } });
        });
      case "stepList":
        return (node.content ?? []).map((step) => {
          const [title, ...rest] = step.content ?? [];
          const body = rest.map(text).filter(Boolean).join(" ");
          return lede(text(title ?? {}), body && ` — ${body}`, {
            numbering: { reference: ORDERED_REFERENCE, level: 0 },
          });
        });
      // Layout containers: their children are the content.
      case "cardGrid":
      case "card":
      case "columnList":
      case "column":
        return blocks(node.content ?? []);
      case "tableOfContents":
        // Word builds its own from the heading styles, and keeps it live.
        return [
          new d.TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        ];
      case "pageBreak":
        return [new d.Paragraph({ children: [new d.PageBreak()] })];
      default:
        return node.content ? blocks(node.content) : [];
    }
  }

  function blocks(nodes: DocumentNode[]): BlockChild[] {
    return nodes.flatMap(block);
  }

  return blocks;
}
