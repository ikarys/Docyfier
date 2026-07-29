import type { DocumentNode } from "@/domain/documents/body";
import type { Paragraph as ParagraphType, Table as TableType } from "docx";
import { diagramLines, diagramTexts } from "@/infrastructure/rendering/diagram-lines";
import { EXPORT_SCALE, type DiagramImages } from "../../diagram-images";
import type { DocxModule, RunBuilder } from "./runs";

/**
 * The two blocks Word shows rather than writes: an uploaded image and a
 * diagram. Both are figures — something to look at, plus the italic line that
 * names it — so the caption is written once, here.
 */

/** Widest an image may be drawn, in pixels: the text column of an A4 page. */
const MAX_IMAGE_WIDTH = 620;

/**
 * An image rendered at `EXPORT_SCALE` shown at its natural size, and no wider
 * than the page. Drawing it at its pixel size would print it several times too
 * large; leaving Word to shrink it loses the sharpness the scale bought.
 */
function fitToPage(width: number, height: number): { width: number; height: number } {
  const natural = width / EXPORT_SCALE;
  const ratio = Math.min(1, MAX_IMAGE_WIDTH / Math.max(1, natural));
  return {
    width: Math.round(natural * ratio),
    height: Math.round((height / EXPORT_SCALE) * ratio),
  };
}

export function figureBuilder(d: DocxModule, runs: RunBuilder, images: DiagramImages) {
  const { linkRun, plain } = runs;

  const emphasis = (value: string, options: { bold?: boolean; italics?: boolean }) =>
    new d.Paragraph({ children: [new d.TextRun({ text: value, ...options })] });

  /** A caption is the italic line under the figure it names. */
  const caption = (value: string | null | undefined): ParagraphType[] =>
    value ? [emphasis(value, { italics: true })] : [];

  /** An image as the link that stands for it: a pure renderer reads no bytes. */
  const image = (node: DocumentNode): ParagraphType[] => [
    new d.Paragraph({ children: [linkRun(node)] }),
    ...caption((node.attrs?.caption as string | null) ?? null),
  ];

  /**
   * A gallery as a one-row table: Word has no other way to keep pictures side
   * by side, and its borders are turned off so the row reads as a row of
   * images rather than as a table.
   */
  const gallery = (node: DocumentNode): TableType =>
    new d.Table({
      width: { size: 100, type: d.WidthType.PERCENTAGE },
      borders: {
        top: { style: d.BorderStyle.NONE },
        bottom: { style: d.BorderStyle.NONE },
        left: { style: d.BorderStyle.NONE },
        right: { style: d.BorderStyle.NONE },
        insideHorizontal: { style: d.BorderStyle.NONE },
        insideVertical: { style: d.BorderStyle.NONE },
      },
      rows: [
        new d.TableRow({
          children: (node.content ?? []).map(
            (child) => new d.TableCell({ children: image(child) }),
          ),
        }),
      ],
    });

  /**
   * A diagram as the drawing itself, embedded.
   *
   * Word is the one target that takes real bytes, so it gets the picture rather
   * than a projection. The image was rendered before the walk started — see
   * `diagram-images.ts` — and a diagram that has none falls back to its
   * relations in words rather than to an empty page.
   */
  const diagram = (node: DocumentNode): ParagraphType[] => {
    const texts = diagramTexts(node);
    const drawn = images.get(node);
    const drawing = drawn
      ? [
          new d.Paragraph({
            children: [
              new d.ImageRun({
                type: "png",
                data: drawn.bytes,
                transformation: fitToPage(drawn.width, drawn.height),
              }),
            ],
          }),
        ]
      : diagramLines(node).map((line) =>
          plain(line.text, { bullet: { level: Math.min(2, line.depth) } }),
        );
    return [
      ...(texts.title ? [emphasis(texts.title, { bold: true })] : []),
      ...drawing,
      ...caption(texts.caption),
    ];
  };

  return { image, gallery, diagram };
}
