import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@/domain/documents/body";
import { docxTarget } from "./docx-target";

/**
 * Word rejects a file over the smallest structural mistake, and none of that
 * shows up until someone opens it. So the payload is unzipped here and read:
 * every block this app renders has to land in `document.xml` as *something*,
 * and the ones Word has no construct for have to land as the projection they
 * were promised — a chart as its own data table, a callout as a shaded cell.
 */

const p = (value: string): DocumentNode => ({
  type: "paragraph",
  content: [{ type: "text", text: value }],
});

/** The document part of the rendered `.docx`, as text. */
async function documentXml(content: DocumentNode[], values = {}): Promise<string> {
  const payload = await docxTarget.render(
    { title: "Rapport", content: { type: "doc", content } },
    values,
  );
  const zip = await JSZip.loadAsync(payload as Uint8Array);
  return zip.file("word/document.xml")!.async("string");
}

describe("docxTarget", () => {
  it("gives a heading Word's own style, not a bold paragraph", async () => {
    const xml = await documentXml([
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Titre" }] },
    ]);

    expect(xml).toContain("Heading2");
    expect(xml).toContain("Titre");
  });

  it("marks up the inline formatting a paragraph carries", async () => {
    const xml = await documentXml([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "gras", marks: [{ type: "bold" }] },
          { type: "text", text: "code", marks: [{ type: "code" }] },
        ],
      },
    ]);

    expect(xml).toContain("gras");
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("Consolas");
  });

  it("numbers an ordered list from the document's own numbering definition", async () => {
    const xml = await documentXml([
      { type: "orderedList", content: [{ type: "listItem", content: [p("premier")] }] },
    ]);

    expect(xml).toContain("premier");
    expect(xml).toContain("w:numPr");
  });

  it("keeps a nested list, at the deeper level Word indents by", async () => {
    const xml = await documentXml([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              p("parent"),
              { type: "bulletList", content: [{ type: "listItem", content: [p("enfant")] }] },
            ],
          },
        ],
      },
    ]);

    expect(xml).toContain("parent");
    expect(xml).toContain("enfant");
  });

  it("writes a chart as the table of its own data, never a dropped block", async () => {
    const xml = await documentXml([
      {
        type: "chart",
        attrs: {
          title: "Ventes",
          caption: "Par trimestre",
          categories: ["T1", "T2"],
          series: [{ label: "2025", values: [10, 20] }],
        },
      },
    ]);

    expect(xml).toContain("Ventes");
    expect(xml).toContain("Par trimestre");
    expect(xml).toContain("T1");
    expect(xml).toContain("2025");
    expect(xml).toContain("<w:tbl>");
  });

  it("writes a callout as a shaded one-cell table under its own label", async () => {
    const xml = await documentXml([
      { type: "callout", attrs: { variant: "warn" }, content: [p("attention")] },
    ]);

    expect(xml).toContain("Warning");
    expect(xml).toContain("attention");
    expect(xml).toContain("FEF3C7");
  });

  it("falls back to the note palette for a variant it does not know", async () => {
    const xml = await documentXml([
      { type: "callout", attrs: { variant: "nonsense" }, content: [p("corps")] },
    ]);

    expect(xml).toContain("Note");
    expect(xml).toContain("EEF2FF");
  });

  it("flattens a timeline entry onto its date and its title", async () => {
    const xml = await documentXml([
      {
        type: "timeline",
        content: [{ type: "timelineItem", content: [p("Janvier"), p("Lancement"), p("détail")] }],
      },
    ]);

    expect(xml).toContain("Janvier — Lancement");
    expect(xml).toContain(": détail");
  });

  it("numbers the steps of a step list and leads on their titles", async () => {
    const xml = await documentXml([
      {
        type: "stepList",
        content: [{ type: "step", content: [p("Préparer"), p("le dossier")] }],
      },
    ]);

    expect(xml).toContain("Préparer");
    expect(xml).toContain(" — le dossier");
    expect(xml).toContain("w:numPr");
  });

  it("reads a stat card as its figure and what it measures", async () => {
    const xml = await documentXml([
      {
        type: "statRow",
        content: [{ type: "statCard", content: [p("42%"), p("croissance"), p("+3")] }],
      },
    ]);

    expect(xml).toContain("42%");
    expect(xml).toContain(" — croissance — +3");
  });

  it("keeps a code block readable one line at a time", async () => {
    const xml = await documentXml([
      { type: "codeBlock", content: [{ type: "text", text: "const a = 1;\nconst b = 2;" }] },
    ]);

    expect(xml).toContain("const a = 1;");
    expect(xml).toContain("const b = 2;");
  });

  it("exports an image as a link, since a pure renderer reads no bytes", async () => {
    const xml = await documentXml(
      [{ type: "image", attrs: { src: "/api/uploads/a.png", alt: "schéma" } }],
      { baseUrl: "https://docs.example.com" },
    );

    expect(xml).toContain("schéma");
    expect(xml).toContain("Hyperlink");
  });

  it("leaves an absolute image URL alone", async () => {
    const xml = await documentXml([
      { type: "image", attrs: { src: "https://cdn.example.com/a.png", alt: "" } },
    ]);

    // No alt: the link still needs something a reader can click.
    expect(xml).toContain("image");
  });

  it("unwraps the layout containers, whose children are the content", async () => {
    const xml = await documentXml([
      {
        type: "cardGrid",
        content: [{ type: "card", content: [p("dans une carte")] }],
      },
    ]);

    expect(xml).toContain("dans une carte");
  });

  it("lets Word build its own table of contents, so it stays live", async () => {
    const xml = await documentXml([{ type: "tableOfContents" }]);

    expect(xml).toContain("TOC");
  });

  it("honours the page size the user picked", async () => {
    const a4 = await documentXml([p("corps")], { pageSize: "a4" });
    const letter = await documentXml([p("corps")], { pageSize: "letter" });

    expect(a4).not.toBe(letter);
  });

  it("renders an unknown block through its children rather than dropping it", async () => {
    const xml = await documentXml([
      { type: "somethingNew", content: [p("survivant")] },
    ]);

    expect(xml).toContain("survivant");
  });
});
