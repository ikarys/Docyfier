/**
 * The body of a document, as the domain sees it.
 *
 * A document is a tree of nodes — the shape ProseMirror produces and the editor
 * reads. The domain describes that shape structurally rather than importing it:
 * `@tiptap/*` is one editor, and the rules in this folder must not depend on
 * which one. The types stay assignable both ways, so no mapping layer is needed
 * at the boundary — only this declaration keeps the dependency from pointing
 * the wrong way.
 */

export interface DocumentMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocumentNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: DocumentMark[];
  content?: DocumentNode[];
}

/** A whole document. Always `type: "doc"` — see `documentBody`. */
export type DocumentBody = DocumentNode;

/** The node type carrying a title inside a cover block. */
const COVER = "docCover";
const HEADING = "heading";

/** A document with nothing typed in it, but a shape the editor can render. */
export function emptyBody(): DocumentBody {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/**
 * Coerce anything that arrives from outside — a driver, a client, an import —
 * into a body. Nothing downstream may see a shape it has to repair.
 */
export function documentBody(value: unknown): DocumentBody {
  if (typeof value !== "object" || value === null) return emptyBody();
  const node = value as DocumentNode;
  if (node.type !== "doc" || !Array.isArray(node.content)) return emptyBody();
  return node.content.length ? node : emptyBody();
}

/** Every character of text a node holds, structure and marks flattened. */
export function nodeText(node: DocumentNode): string {
  if (node.text !== undefined) return node.text;
  if (Array.isArray(node.content)) return node.content.map(nodeText).join("");
  return "";
}

/**
 * The heading that names the document: the first one at the top level, or the
 * one inside the cover block when the document opens on a cover.
 */
export function titleHeading(body: DocumentBody): DocumentNode | undefined {
  return findHeading(body.content ?? []);
}

function findHeading(nodes: DocumentNode[]): DocumentNode | undefined {
  for (const node of nodes) {
    if (node.type === HEADING) return node;
    if (node.type === COVER) {
      const inner = findHeading(node.content ?? []);
      if (inner) return inner;
    }
  }
  return undefined;
}

/** The top-level blocks. The unit every whole-document edit addresses. */
export function blocksOf(body: DocumentBody): DocumentNode[] {
  return body.content ?? [];
}

/** An independent copy — editing one body must never reach the other. */
export function copyBody(body: DocumentBody): DocumentBody {
  return structuredClone(body);
}
