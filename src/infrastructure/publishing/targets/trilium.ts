import { docToHtml, escapeHtml } from "@/infrastructure/rendering/html";
import { optionValue, type ExportTarget } from "@/domain/publishing/export-target";

/**
 * Trilium Notes export.
 *
 * A Trilium text note *is* HTML, so the semantic fragment goes in as-is —
 * pasted into a note, or imported as a file. The full-document option wraps the
 * fragment in a minimal page with a `<title>`, which is what Trilium's HTML
 * import reads to name the note; the fragment alone would land as "Untitled".
 */
export const triliumTarget: ExportTarget = {
  id: "trilium",
  label: "Trilium Notes",
  description: "Semantic HTML — the format a Trilium text note stores natively.",
  instructions:
    "Copy and paste into a note, or download and use Import → HTML to create the note in place.",
  mime: "text/html",
  extension: "html",
  options: [
    {
      id: "document",
      label: "Wrap as a full HTML document",
      type: "toggle",
      default: "off",
      help: "Needed for Import → HTML, which names the note after <title>. Leave off to paste into an open note.",
    },
  ],
  render(doc, values) {
    const body = docToHtml(doc.content, {}, { baseUrl: values.baseUrl ?? "" });
    if (optionValue(triliumTarget, values, "document") !== "on") return body;
    return [
      "<!doctype html>",
      '<html><head><meta charset="utf-8" />',
      `<title>${escapeHtml(doc.title)}</title>`,
      "</head><body>",
      body,
      "</body></html>",
      "",
    ].join("\n");
  },
};
