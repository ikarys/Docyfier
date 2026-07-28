import { DOMParser as PMDOMParser, type Schema } from "@tiptap/pm/model";
import { emptyBody, type DocumentBody, type DocumentNode } from "@/domain/documents/body";

/**
 * HTML into document JSON, read with the editor's own schema (PLAN.md STEP 5).
 *
 * Which schema that is comes in as an argument: this adapter knows how to parse
 * HTML, not which nodes the editor offers. Everything imported lands on the
 * same node types and inherits the schema's parse rules for free.
 */

/**
 * Drop what must never reach a document: images (their `src` would point at a
 * file this instance does not serve — same rule the AI contract enforces),
 * and anything executable or presentational carried by the source file.
 */
function stripUnsupportedHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<input[^>]*>/gi, "");
}

/** The editor offers levels 1-3; deeper headings from the source collapse
 * onto 3 rather than rendering as an unstyled outlier. */
function clampHeadings(node: DocumentNode): DocumentNode {
  if (node.type === "heading" && typeof node.attrs?.level === "number") {
    node.attrs.level = Math.min(3, Math.max(1, node.attrs.level));
  }
  node.content?.forEach(clampHeadings);
  return node;
}

export async function parseHtmlBody(
  html: string,
  schema: Schema,
): Promise<DocumentBody> {
  const { parseHTML } = await import("linkedom");
  const { document } = parseHTML(
    `<html><body>${stripUnsupportedHtml(html)}</body></html>`,
  );
  const node = PMDOMParser.fromSchema(schema).parse(
    document.body as unknown as HTMLElement,
  );
  const body = clampHeadings(node.toJSON() as DocumentBody);
  // A file with no convertible content still has to open on something the
  // editor can put a caret in.
  return body.content?.length ? body : emptyBody();
}
