import { optionValue, type ExportTarget } from "@/domain/publishing/export-target";
import { rasterizeDiagrams } from "../../diagram-images";
import { sharpRasterizer } from "../../sharp-rasterizer";
import { blockBuilder, ORDERED_REFERENCE } from "./blocks";

/**
 * Word export (PLAN.md STEP 5, #8).
 *
 * Built with the `docx` object model rather than by converting HTML: Word
 * rejects a file over the smallest structural mistake, and numbered lists,
 * table borders and heading styles are exactly what an HTML converter gets
 * wrong. The library is imported dynamically, like `mammoth` on the import
 * side, so it never reaches a browser bundle.
 *
 * Images are the one thing this target does not embed: their bytes live behind
 * `/api/uploads` and a pure renderer does not read the filesystem, so they
 * export as a captioned link.
 */

/** Page sizes, in millimetres. */
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

const MARGINS_MM = { top: 20, bottom: 20, left: 18, right: 18 };
const INDENT_STEP = 720;

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
    const images = await rasterizeDiagrams(doc.content, sharpRasterizer);
    const blocks = blockBuilder(d, values.baseUrl ?? "", images);
    const size = PAGE_SIZES[optionValue(docxTarget, values, "pageSize")] ?? PAGE_SIZES.a4;
    const mm = d.convertMillimetersToTwip;

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
              style: {
                paragraph: { indent: { left: INDENT_STEP * (level + 1), hanging: 360 } },
              },
            })),
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: mm(size.width), height: mm(size.height) },
              margin: {
                top: mm(MARGINS_MM.top),
                bottom: mm(MARGINS_MM.bottom),
                left: mm(MARGINS_MM.left),
                right: mm(MARGINS_MM.right),
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
