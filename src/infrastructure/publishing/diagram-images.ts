import type { DocumentBody, DocumentNode } from "@/domain/documents/body";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { toScene } from "@/domain/documents/diagram/scene";
import { isDiagramAttrs } from "@/domain/documents/diagram/validation";
import type { ImageRasterizer, RasterImage } from "@/domain/publishing/image-rasterizer";
import { sceneToSvg } from "@/infrastructure/rendering/svg/scene-to-svg";

/**
 * Every diagram in a document, drawn once and handed to a target as pixels.
 *
 * Done ahead of the render rather than inside it: the renderers are pure and
 * synchronous, and turning them inside out to await an image would cost far
 * more than walking the document twice.
 *
 * Keyed by node identity, so two diagrams that happen to say the same thing
 * still get their own image and nothing is shared by accident.
 */

/** Word's rendering is crisper than its scaling; twice the size is enough. */
export const EXPORT_SCALE = 2;

export type DiagramImages = Map<DocumentNode, RasterImage>;

export async function rasterizeDiagrams(
  body: DocumentBody | undefined,
  rasterizer: ImageRasterizer,
  scale = EXPORT_SCALE,
): Promise<DiagramImages> {
  const images: DiagramImages = new Map();
  for (const node of diagramsIn(body?.content)) {
    const attrs = node.attrs ?? {};
    if (!isDiagramAttrs(attrs)) continue;
    images.set(node, await rasterizer.toPng(sceneToSvg(toScene(placeNodes(attrs))), scale));
  }
  return images;
}

function diagramsIn(nodes: DocumentNode[] | undefined): DocumentNode[] {
  return (nodes ?? []).flatMap((node) => [
    ...(node.type === "diagram" ? [node] : []),
    ...diagramsIn(node.content),
  ]);
}

export function toDataUri(image: RasterImage): string {
  return `data:image/png;base64,${Buffer.from(image.bytes).toString("base64")}`;
}
