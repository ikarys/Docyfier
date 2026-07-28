import type { DocumentNode } from "@/domain/documents/body";
import type { Paragraph as ParagraphType, Table as TableType } from "docx";
import type { DocxModule, RunBuilder } from "./runs";

/**
 * The blocks Word has no construct for, projected onto the one it does have:
 * a table. A chart becomes the table of its own data, a callout a shaded
 * one-cell table — never a dropped block.
 */

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

const HEADER_FILL = "F3F4F6";

/** How a table-shaped block reaches back for its own children. */
type Blocks = (nodes: DocumentNode[]) => (ParagraphType | TableType)[];

export interface TableBuilder {
  table(node: DocumentNode): TableType;
  callout(node: DocumentNode): TableType;
  chart(node: DocumentNode): (ParagraphType | TableType)[];
}

export function tableBuilder(
  d: DocxModule,
  runs: RunBuilder,
  blocks: Blocks,
): TableBuilder {
  const fullWidth = { size: 100, type: d.WidthType.PERCENTAGE };

  const cell = (node: DocumentNode, header: boolean) => {
    // Word refuses a cell with no paragraph in it.
    const children = blocks(node.content ?? []);
    return new d.TableCell({
      children: children.length ? children : [runs.plain("")],
      ...(header ? { shading: { fill: HEADER_FILL } } : {}),
      columnSpan: Number(node.attrs?.colspan ?? 1) || 1,
      rowSpan: Number(node.attrs?.rowspan ?? 1) || 1,
    });
  };

  const table = (node: DocumentNode): TableType =>
    new d.Table({
      width: fullWidth,
      rows: (node.content ?? []).map(
        (row) =>
          new d.TableRow({
            children: (row.content ?? []).map((c) => cell(c, c.type === "tableHeader")),
          }),
      ),
    });

  /** A grid of strings as a bordered table — what charts fall back to. */
  const gridTable = (rows: string[][]): TableType =>
    new d.Table({
      width: fullWidth,
      rows: rows.map(
        (row, rowIndex) =>
          new d.TableRow({
            children: row.map(
              (value) =>
                new d.TableCell({
                  children: [
                    new d.Paragraph({
                      children: [new d.TextRun({ text: value, bold: rowIndex === 0 })],
                    }),
                  ],
                  ...(rowIndex === 0 ? { shading: { fill: HEADER_FILL } } : {}),
                }),
            ),
          }),
      ),
    });

  const chart = (node: DocumentNode): (ParagraphType | TableType)[] => {
    const { title, caption, categories, series } = (node.attrs ?? {}) as {
      title?: string | null;
      caption?: string | null;
      categories?: string[];
      series?: { label: string; values: number[] }[];
    };
    const cats = categories ?? [];
    const rows = [
      ["", ...cats],
      ...(series ?? []).map((s) => [
        s.label,
        ...cats.map((_, i) => String(s.values[i] ?? "")),
      ]),
    ];
    return [
      ...(title
        ? [new d.Paragraph({ children: [new d.TextRun({ text: title, bold: true })] })]
        : []),
      gridTable(rows),
      ...(caption
        ? [
            new d.Paragraph({
              children: [new d.TextRun({ text: caption, italics: true })],
            }),
          ]
        : []),
    ];
  };

  const callout = (node: DocumentNode): TableType => {
    const variant = String(node.attrs?.variant ?? "note");
    return new d.Table({
      width: fullWidth,
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

  return { table, callout, chart };
}
