import { getDocument } from "@/lib/store";
import { docToMarkdown, markdownFilename } from "@/infrastructure/rendering/markdown";
import { isAuthorized } from "@/lib/auth";

/** Download a document as markdown (PLAN.md STEP 3). Exports what is stored,
 * so an in-flight edit lands in the file once autosave has run. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await isAuthorized())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) return new Response("Document not found", { status: 404 });

  return new Response(docToMarkdown(doc.content), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${markdownFilename(doc.title)}"`,
      "cache-control": "no-store",
    },
  });
}
