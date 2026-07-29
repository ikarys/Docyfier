import type { DocumentNode } from "@/domain/documents/body";
import { escapeHtml, type HtmlDialect } from "@/infrastructure/rendering/html";
import { diagramLines, diagramTexts } from "@/infrastructure/rendering/diagram-lines";
import { EXPORT_SCALE, toDataUri, type DiagramImages } from "./diagram-images";

/**
 * A diagram as an embedded bitmap, for the destinations that paste HTML.
 *
 * The default HTML rendering inlines the SVG, which is sharper and smaller —
 * but a paste handler on the other side decides what survives, and every tool
 * this app targets uploads a `data:` image reliably where inline vector art is
 * a coin toss. The picture matters more than the bytes here.
 */
export function diagramImageDialect(images: DiagramImages): HtmlDialect {
  return {
    block(node: DocumentNode): string | null {
      if (node.type !== "diagram") return null;
      const image = images.get(node);
      if (!image) return null;
      const { title, caption } = diagramTexts(node);
      const width = Math.round(image.width / EXPORT_SCALE);
      return [
        title ? `<p><strong>${escapeHtml(title)}</strong></p>` : "",
        `<figure><img src="${toDataUri(image)}" width="${width}" alt="${escapeHtml(
          title ?? "diagram",
        )}" /></figure>`,
        caption ? `<p><em>${escapeHtml(caption)}</em></p>` : "",
      ]
        .filter(Boolean)
        .join("\n");
    },
  };
}

/**
 * A diagram as a list of its relations.
 *
 * For a dialect that can carry neither a drawing nor a bitmap — Confluence
 * storage format models images as attachments already on the page, so there is
 * nothing an exported payload could point at.
 */
export function diagramOutlineHtml(node: DocumentNode): string {
  const { title, caption } = diagramTexts(node);
  const items = diagramLines(node)
    .map((line) => `<li>${"— ".repeat(line.depth)}${escapeHtml(line.text)}</li>`)
    .join("");
  return [
    title ? `<p><strong>${escapeHtml(title)}</strong></p>` : "",
    items ? `<ul>${items}</ul>` : "",
    caption ? `<p><em>${escapeHtml(caption)}</em></p>` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
