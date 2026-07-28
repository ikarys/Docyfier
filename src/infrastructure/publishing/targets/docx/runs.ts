import type { DocumentNode } from "@/domain/documents/body";
import type { IParagraphOptions, Paragraph as ParagraphType } from "docx";

/**
 * What goes *inside* a Word paragraph: runs, hyperlinks, and the two paragraph
 * constructors every block builder reaches for.
 *
 * The `docx` module is passed in rather than imported: it is loaded dynamically
 * so it never reaches a browser bundle, and every function here would otherwise
 * have to take it as a parameter.
 */

export type DocxModule = typeof import("docx");
export type Run =
  | InstanceType<DocxModule["TextRun"]>
  | InstanceType<DocxModule["ExternalHyperlink"]>;

export const MONO = "Consolas";
export const CODE_FILL = "F3F4F6";

export interface RunBuilder {
  /** Every character of text a node holds, whitespace collapsed. */
  text(node: DocumentNode): string;
  /** The same, verbatim — what a code block needs. */
  rawText(node: DocumentNode): string;
  inline(nodes: DocumentNode[] | undefined): Run[];
  /** An image, as the link a reader can still follow. */
  linkRun(node: DocumentNode): Run;
  paragraph(nodes: DocumentNode[] | undefined, options?: IParagraphOptions): ParagraphType;
  plain(value: string, options?: IParagraphOptions): ParagraphType;
}

export function runBuilder(d: DocxModule, baseUrl: string): RunBuilder {
  const url = (src: string): string => {
    const base = baseUrl.replace(/\/+$/, "");
    return base && src.startsWith("/") ? `${base}${src}` : src;
  };

  const text = (node: DocumentNode): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(text).join(" ").replace(/\s+/g, " ").trim();
  };

  const rawText = (node: DocumentNode): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.content ?? []).map(rawText).join("");
  };

  const linkRun = (node: DocumentNode): Run => {
    const { src, alt } = (node.attrs ?? {}) as { src?: string; alt?: string };
    return new d.ExternalHyperlink({
      children: [
        new d.TextRun({ text: alt?.trim() || "image", italics: true, style: "Hyperlink" }),
      ],
      link: url(String(src ?? "")),
    });
  };

  const inline = (nodes: DocumentNode[] | undefined): Run[] => {
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
        subScript: marks.some((m) => m.type === "subscript"),
        superScript: marks.some((m) => m.type === "superscript"),
        ...(code ? { font: MONO, shading: { fill: CODE_FILL } } : {}),
      });

      const link = marks.find((m) => m.type === "link");
      return link?.attrs?.href
        ? [new d.ExternalHyperlink({ children: [run], link: String(link.attrs.href) })]
        : [run];
    });
  };

  return {
    text,
    rawText,
    inline,
    linkRun,
    paragraph: (nodes, options = {}) =>
      new d.Paragraph({ children: inline(nodes), ...options }),
    plain: (value, options = {}) =>
      new d.Paragraph({ children: [new d.TextRun(value)], ...options }),
  };
}
