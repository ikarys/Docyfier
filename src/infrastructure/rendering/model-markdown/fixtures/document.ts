import type { DocumentNode } from "@/domain/documents/body";
import { heading, text, type RoundTripCase } from "./nodes";

/** What frames the document rather than says anything: cover, media, page furniture. */

const IMAGE: DocumentNode = {
  type: "image",
  attrs: {
    src: "/uploads/chart.png",
    alt: "Courbe des ventes",
    caption: "Ventes 2025",
    align: "left",
    width: 50,
  },
};

export const DOCUMENT_CASES: RoundTripCase[] = [
  {
    name: "cover with its subtitle lines",
    blocks: [
      {
        type: "docCover",
        content: [
          heading(1, "Rapport annuel"),
          { type: "coverLine", attrs: { variant: "subtitle" }, content: [text("Exercice 2025")] },
          { type: "coverLine", attrs: { variant: "meta" }, content: [text("31 juillet 2026")] },
        ],
      },
    ],
  },
  { name: "page break", blocks: [{ type: "pageBreak" }] },
  { name: "table of contents", blocks: [{ type: "tableOfContents" }] },
  { name: "image placed and sized", blocks: [IMAGE] },
  {
    name: "image row",
    blocks: [
      {
        type: "imageRow",
        content: [IMAGE, { ...IMAGE, attrs: { ...IMAGE.attrs, alt: "Seconde" } }],
      },
    ],
  },
  {
    name: "embed",
    blocks: [
      {
        type: "embed",
        attrs: {
          provider: "YouTube",
          href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          title: "La démo",
        },
      },
    ],
  },
  {
    name: "attachment",
    blocks: [
      { type: "attachment", attrs: { href: "/uploads/brief.pdf", name: "brief.pdf", size: 20480 } },
    ],
  },
];
