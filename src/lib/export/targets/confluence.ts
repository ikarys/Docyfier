import type { JSONContent } from "@tiptap/core";
import { docToHtml, escapeHtml, rawText, type HtmlDialect } from "@/lib/doc/html";
import { optionValue, type ExportTarget } from "../types";

/**
 * Confluence export.
 *
 * Two formats, because Confluence has two ways in and they do not overlap:
 *
 * - `rich`: semantic HTML. Pasting it into the editor makes Confluence convert
 *   the clipboard markup into its own document model. Works on Cloud and on
 *   Data Center, and is the only option on Cloud.
 * - `storage`: Confluence storage format, the XHTML dialect with `ac:` macros.
 *   Higher fidelity — callouts become real panels, code blocks the code macro —
 *   but it can only be pasted where the source is editable, i.e. Data Center
 *   with the source editor.
 */

/** Callout variants → the panel macros Confluence ships with. */
const PANEL_BY_VARIANT: Record<string, string> = {
  note: "info",
  tip: "tip",
  warn: "note",
  danger: "warning",
};

function macro(name: string, body: string, params: Record<string, string> = {}): string {
  const parameters = Object.entries(params)
    .filter(([, value]) => value !== "")
    .map(
      ([key, value]) =>
        `<ac:parameter ac:name="${key}">${escapeHtml(value)}</ac:parameter>`,
    )
    .join("");
  return `<ac:structured-macro ac:name="${name}">${parameters}${body}</ac:structured-macro>`;
}

/** Storage format only differs on the blocks Confluence models as macros. */
const storageDialect: HtmlDialect = {
  block(node: JSONContent, ctx): string | null {
    switch (node.type) {
      case "callout": {
        const panel = PANEL_BY_VARIANT[String(node.attrs?.variant ?? "note")] ?? "info";
        return macro(panel, `<ac:rich-text-body>${ctx.blocks(node.content)}</ac:rich-text-body>`);
      }
      case "codeBlock": {
        const language = String(node.attrs?.language ?? "");
        // CDATA cannot contain "]]>"; splitting the sequence keeps the payload
        // valid without touching the code the user wrote.
        const code = rawText(node).replace(/]]>/g, "]]]]><![CDATA[>");
        return macro(
          "code",
          `<ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body>`,
          { language },
        );
      }
      case "tableOfContents":
        // Confluence builds its own from the headings it just received.
        return macro("toc", "");
      case "pageBreak":
        return macro("pagebreak", "");
      case "image": {
        const src = String(node.attrs?.src ?? "");
        if (!src) return "";
        const absolute = ctx.url(src);
        // A relative src would resolve against the Confluence host, not this
        // instance, and silently render a broken image.
        return absolute.startsWith("http")
          ? `<ac:image><ri:url ri:value="${escapeHtml(absolute)}" /></ac:image>`
          : "";
      }
      default:
        return null;
    }
  },
};

export const confluenceTarget: ExportTarget = {
  id: "confluence",
  label: "Confluence",
  description:
    "Rich HTML to paste into the editor, or Confluence storage format for a Data Center source editor.",
  instructions:
    "Copy, then paste into an empty Confluence page. Storage format needs the source editor (Data Center); on Cloud, use rich HTML.",
  mime: "text/html",
  extension: "html",
  options: [
    {
      id: "format",
      label: "Format",
      type: "select",
      default: "rich",
      help: "Rich HTML pastes anywhere. Storage format keeps panels and code macros, Data Center only.",
      choices: [
        { value: "rich", label: "Rich HTML (paste into the editor)" },
        { value: "storage", label: "Confluence storage format (XHTML)" },
      ],
    },
  ],
  render(doc, values) {
    const storage = optionValue(confluenceTarget, values, "format") === "storage";
    // `baseUrl` is injected by the caller from the shared export settings, not
    // declared here: every target that emits images needs the same value.
    return docToHtml(doc.content, storage ? storageDialect : {}, {
      baseUrl: values.baseUrl ?? "",
    });
  },
};
