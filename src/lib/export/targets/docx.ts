import type { JSONContent } from "@tiptap/core";
import type {
  IParagraphOptions,
  Paragraph as ParagraphType,
  Table as TableType,
  TableOfContents as TableOfContentsType,
} from "docx";
import { optionValue, type ExportTarget } from "../types";

/**
 * Word export (PLAN.md STEP 5, #8).
 *
 * Built with the `docx` object model rather than by converting HTML: Word
 * rejects a file over the smallest structural mistake, and numbered lists,
 * table borders and heading styles are exactly what an HTML converter gets
 * wrong. The library is imported dynamically, like `mammoth` on the import
 * side, so it never reaches a browser bundle.
 *
 * Blocks with no Word equivalent are projected onto the closest construct — a
 * chart becomes the table of its own data, a callout a shaded one-cell table —
 * and never dropped. Images are the exception: their bytes live behind
 * `/api/uploads` and a pure renderer does not read the filesystem, so they
 * export as a captioned link.
 */

type DocxModule = typeof import("docx");
type BlockChild = ParagraphType | TableType | TableOfContentsType;

/** Numbering definition referenced by every ordered list in the document. */
const ORDERED_REFERENCE = "docyfier-ordered";

/** Callout variants → cell background, matching the in-app palette. */
const CALLOUT_FILL: Record<string, string> = {
  note: "EEF2FF",
  tip: "ECFDF5",
  warn: "FEF3C7",
  danger: "FEE2E2",
};

const CALLOUT_LABEL: Record<string, string> = {
  note: "Note",
  tip: "Tip",
  warn: "Warning",
  danger: "Caution",
};

const HEADING_BY_LEVEL = [
  "Heading1",
  "Heading2",
  "Heading3",
  "Heading4",
  "Heading5",
  "Heading6",
] as const;

const MONO = "Consolas";
const CODE_FILL = "F3F4F6";

/** The walk, closed over the loaded module so no function has to take it. */
function makeBuilder(d: DocxModule, baseUrl: string) {
  const url = (src: string): string => {
    const base = baseUrl.replace(/\/+$/, "");
    return base && src.startsWith("/") ? `${base}${src}` : src;
  };

  const text = (node: JSONContent): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(text).join(" ").replace(/\s+/g, " ").trim();
  };

  const rawText = (node: JSONContent): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(rawText).join("");
  };

  /** Inline content as runs. A link becomes a hyperlink wrapping its own runs,
   * which is why this returns the union type Word expects in a paragraph. */
  const inline = (
    nodes: JSONContent[] | undefined,
  ): (InstanceType<DocxModule["TextRun"]> | InstanceType<DocxModule["ExternalHyperlink"]>)[] => {
    if (!nodes) return [];
    return nodes.flatMap((node) => {
      if (node.type === "hardBreak") return [new d.TextRun({ break: 1 })];
      if (node.type === "image") return [linkRun(node)];
      if (node.type !== "text") return inline(node.content);

      const marks = node.marks ?? [];
      const code = marks.some((m) => m.type === "code");
      const run = new d.TextRun({
        text: node.text ?? "",
        // A badge is a colored pill carrying a status ("Done", "P1"); bold is
        // the emphasis that survives everywhere.
        bold: marks.some((m) => m.type === "bold" || m.type === "badge"),
        italics: marks.some((m) => m.type === "italic"),
        strike: marks.some((m) => m.type === "strike"),
        ...(code ? { font: MONO, shading: { fill: CODE_FILL } } : {}),
      });

      const link = marks.find((m) => m.type === "link");
      return link?.attrs?.href
        ? [new d.ExternalHyperlink({ children: [run], link: String(link.attrs.href) })]
        : [run];
    });
  };

  /** An image, as the link a reader can still follow. */
  function linkRun(node: JSONContent): InstanceType<DocxModule["ExternalHyperlink"]> {
    const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
    const target = url(String(src ?? ""));
    return new d.ExternalHyperlink({
      children: [
        new d.TextRun({ text: alt?.trim() || "image", italics: true, style: "Hyperlink" }),
      ],
      link: target,
    });
  }

  const paragraph = (
    nodes: JSONContent[] | undefined,
    options: IParagraphOptions = {},
  ): ParagraphType => new d.Paragraph({ children: inline(nodes), ...options });

  const plain = (value: string, options: IParagraphOptions = {}): ParagraphType =>
    new d.Paragraph({ children: [new d.TextRun(value)], ...options });

  /** List items, flattened: Word carries the nesting on each paragraph. */
  const list = (node: JSONContent, ordered: boolean, level: number): BlockChild[] =>
    (node.content ?? []).flatMap((item) =>
      (item.content ?? []).flatMap((child, index) => {
        if (child.type === "bulletList") return list(child, false, level + 1);
        if (child.type === "orderedList") return list(child, true, level + 1);
        // Only the first paragraph of an item carries the marker; the rest are
        // continuation lines at the same indent.
        const marker =
          index > 0
            ? { indent: { left: 720 * (level + 1) } }
            : ordered
              ? { numbering: { reference: ORDERED_REFERENCE, level } }
              : { bullet: { level } };
        return child.type === "paragraph"
          ? [paragraph(child.content, marker)]
          : blocks([child]);
      }),
    );

  const cell = (node: JSONContent, header: boolean) => {
    // Word refuses a cell with no paragraph in it.
    const children = blocks(node.content ?? []);
    return new d.TableCell({
      children: children.length ? children : [plain("")],
      ...(header ? { shading: { fill: "F3F4F6" } } : {}),
      columnSpan: Number(node.attrs?.colspan ?? 1) || 1,
      rowSpan: Number(node.attrs?.rowspan ?? 1) || 1,
    });
  };

  const table = (node: JSONContent): TableType =>
    new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      rows: (node.content ?? []).map(
        (row) =>
          new d.TableRow({
            children: (row.content ?? []).map((c) => cell(c, c.type === "tableHeader")),
          }),
      ),
    });

  /** A grid of strings as a bordered table — the shape charts and stats fall
   * back to. */
  const gridTable = (rows: string[][], headerRow: boolean): TableType =>
    new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      rows: rows.map(
        (row, rowIndex) =>
          new d.TableRow({
            children: row.map(
              (value) =>
                new d.TableCell({
                  children: [
                    new d.Paragraph({
                      children: [
                        new d.TextRun({ text: value, bold: headerRow && rowIndex === 0 }),
                      ],
                    }),
                  ],
                  ...(headerRow && rowIndex === 0 ? { shading: { fill: "F3F4F6" } } : {}),
                }),
            ),
          }),
      ),
    });

  const chart = (node: JSONContent): BlockChild[] => {
    const { title, caption, categories, series } = (node.attrs ?? {}) as {
      title?: string | null;
      caption?: string | null;
      categories?: string[];
      series?: { label: string; values: number[] }[];
    };
    const cats = categories ?? [];
    const rows = [
      ["", ...cats],
      ...(series ?? []).map((s) => [s.label, ...cats.map((_, i) => String(s.values[i] ?? ""))]),
    ];
    return [
      ...(title ? [new d.Paragraph({ children: [new d.TextRun({ text: title, bold: true })] })] : []),
      gridTable(rows, true),
      ...(caption
        ? [new d.Paragraph({ children: [new d.TextRun({ text: caption, italics: true })] })]
        : []),
    ];
  };

  /** A callout, as the one-cell shaded table Word renders closest to it. */
  const callout = (node: JSONContent): TableType => {
    const variant = String(node.attrs?.variant ?? "note");
    return new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      rows: [
        new d.TableRow({
          children: [
            new d.TableCell({
              shading: { fill: CALLOUT_FILL[variant] ?? CALLOUT_FILL.note },
              children: [
                new d.Paragraph({
                  children: [
                    new d.TextRun({ text: CALLOUT_LABEL[variant] ?? "Note", bold: true }),
                  ],
                }),
                ...(blocks(node.content ?? []) as ParagraphType[]),
              ],
            }),
          ],
        }),
      ],
    });
  };

  function block(node: JSONContent): BlockChild[] {
    switch (node.type) {
      case "heading": {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
        return [paragraph(node.content, { heading: HEADING_BY_LEVEL[level - 1] })];
      }
      case "paragraph":
        return [paragraph(node.content)];
      case "bulletList":
        return list(node, false, 0);
      case "orderedList":
        return list(node, true, 0);
      case "blockquote":
        // Word has no quote container: the rule and the indent are what makes a
        // run of paragraphs read as quoted.
        return (node.content ?? []).map((child) =>
          new d.Paragraph({
            children: inline(child.content),
            indent: { left: 480 },
            border: { left: { style: d.BorderStyle.SINGLE, size: 12, color: "D1D5DB", space: 12 } },
          }),
        );
      case "codeBlock":
        // One paragraph per line: a single run with newlines collapses in Word.
        return rawText(node)
          .split("\n")
          .map((line) =>
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
        return [table(node)];
      case "image":
        return [new d.Paragraph({ children: [linkRun(node)] })];
      case "callout":
        return [callout(node)];
      case "chart":
        return chart(node);
      case "statRow":
        return (node.content ?? []).map((stat) => {
          const [value, label, delta] = (stat.content ?? []).map(text);
          const tail = [label, delta].filter(Boolean).join(" — ");
          return new d.Paragraph({
            bullet: { level: 0 },
            children: [
              new d.TextRun({ text: value ?? "", bold: true }),
              ...(tail ? [new d.TextRun({ text: ` — ${tail}` })] : []),
            ],
          });
        });
      case "docCover":
        // The cover's own heading is the document title; its extra lines are
        // subtitle, chips and meta.
        return (node.content ?? []).flatMap((line) =>
          line.type === "coverLine"
            ? [
                new d.Paragraph({
                  children: [new d.TextRun({ text: text(line), italics: true })],
                }),
              ]
            : block(line),
        );
      case "pyramid":
        return (node.content ?? []).map((tier) =>
          plain(text(tier), { bullet: { level: 0 } }),
        );
      case "timeline":
        return (node.content ?? []).map((item) => {
          const [when, title, ...rest] = item.content ?? [];
          const head = [text(when ?? {}), text(title ?? {})].filter(Boolean).join(" — ");
          const body = rest.map(text).filter(Boolean).join(" ");
          return new d.Paragraph({
            bullet: { level: 0 },
            children: [
              new d.TextRun({ text: head, bold: true }),
              ...(body ? [new d.TextRun({ text: `: ${body}` })] : []),
            ],
          });
        });
      case "stepList":
        return (node.content ?? []).map((step) => {
          const [title, ...rest] = step.content ?? [];
          const body = rest.map(text).filter(Boolean).join(" ");
          return new d.Paragraph({
            numbering: { reference: ORDERED_REFERENCE, level: 0 },
            children: [
              new d.TextRun({ text: text(title ?? {}), bold: true }),
              ...(body ? [new d.TextRun({ text: ` — ${body}` })] : []),
            ],
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
        return [new d.TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-3" })];
      case "pageBreak":
        return [new d.Paragraph({ children: [new d.PageBreak()] })];
      default:
        return node.content ? blocks(node.content) : [];
    }
  }

  function blocks(nodes: JSONContent[]): BlockChild[] {
    return nodes.flatMap(block);
  }

  return { blocks };
}

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

export const docxTarget: ExportTarget = {
  id: "docx",
  label: "Word (.docx)",
  description: "A Word document with real heading styles, lists and tables.",
  instructions: "Download the file and open it in Word, LibreOffice or Google Docs.",
  mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  extension: "docx",
  binary: true,
  options: [
    {
      id: "pageSize",
      label: "Page size",
      type: "select",
      default: "a4",
      choices: [
        { value: "a4", label: "A4" },
        { value: "letter", label: "US Letter" },
      ],
    },
  ],
  async render(doc, values) {
    const d = await import("docx");
    const { blocks } = makeBuilder(d, values.baseUrl ?? "");
    const size = PAGE_SIZES[optionValue(docxTarget, values, "pageSize")] ?? PAGE_SIZES.a4;

    const file = new d.Document({
      title: doc.title,
      creator: "Docyfier",
      numbering: {
        config: [
          {
            reference: ORDERED_REFERENCE,
            levels: [0, 1, 2].map((level) => ({
              level,
              format: d.LevelFormat.DECIMAL,
              text: `%${level + 1}.`,
              alignment: d.AlignmentType.START,
              style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
            })),
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                width: d.convertMillimetersToTwip(size.width),
                height: d.convertMillimetersToTwip(size.height),
              },
              margin: {
                top: d.convertMillimetersToTwip(20),
                bottom: d.convertMillimetersToTwip(20),
                left: d.convertMillimetersToTwip(18),
                right: d.convertMillimetersToTwip(18),
              },
            },
          },
          footers: {
            default: new d.Footer({
              children: [
                new d.Paragraph({
                  alignment: d.AlignmentType.CENTER,
                  children: [new d.TextRun({ children: [d.PageNumber.CURRENT] })],
                }),
              ],
            }),
          },
          children: blocks(doc.content?.content ?? []),
        },
      ],
    });

    return new Uint8Array(await d.Packer.toBuffer(file));
  },
};
