import { getDocument } from "@/lib/store";
import { isAuthorized } from "@/lib/auth";
import { renderExport } from "@/lib/export/service";

/** Download the payload of an export target as a file. Exports what is stored,
 * so an in-flight edit lands in the file once autosave has run. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ target: string; id: string }> },
): Promise<Response> {
  if (!(await isAuthorized())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { target, id } = await params;
  const doc = await getDocument(id);
  if (!doc) return new Response("Document not found", { status: 404 });

  const result = await renderExport(doc, target);
  // Unknown and disabled are the same answer on purpose: a target the user
  // turned off must not stay reachable by URL.
  if (!result) return new Response("Export target not available", { status: 404 });

  // A binary payload goes out as its own buffer; `Response` types the union
  // more narrowly than it accepts.
  const body =
    typeof result.payload === "string"
      ? result.payload
      : new Blob([result.payload], { type: result.mime });

  return new Response(body, {
    headers: {
      "Content-Type": `${result.mime}; charset=utf-8`,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
