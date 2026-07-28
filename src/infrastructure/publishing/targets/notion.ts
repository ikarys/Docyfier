import { docToMarkdown } from "@/infrastructure/rendering/markdown";
import { optionValue, type ExportTarget } from "@/domain/publishing/export-target";

/**
 * Notion export.
 *
 * Notion's paste handler reads markdown: pasted `## ` becomes a heading, `- `
 * a bulleted list, a fenced block a code block. That makes the existing
 * markdown renderer the right payload — HTML pasted into Notion collapses into
 * plain paragraphs.
 *
 * The title is optional because Notion takes the page name from the first
 * heading when the page is empty, and duplicates it otherwise.
 */
export const notionTarget: ExportTarget = {
  id: "notion",
  label: "Notion",
  description: "Markdown, the format Notion's paste handler understands.",
  instructions:
    "Copy, then paste into an empty Notion page. Notion converts the markdown as it lands.",
  mime: "text/markdown",
  extension: "md",
  options: [
    {
      id: "titleHeading",
      label: "Prepend the document title",
      type: "toggle",
      default: "off",
      help: "Off by default: Notion already names the page after the first heading.",
    },
  ],
  render(doc, values) {
    const body = docToMarkdown(doc.content);
    return optionValue(notionTarget, values, "titleHeading") === "on"
      ? `# ${doc.title}\n\n${body}`
      : body;
  },
};
