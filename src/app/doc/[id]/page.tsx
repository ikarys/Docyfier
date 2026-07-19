import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/store";
import { deleteDocumentAction } from "@/app/actions";
import { DocumentEditor } from "@/components/Editor";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  return (
    <>
      <header className="app-header">
        <Link className="brand" href="/">
          Docy<span>fier</span>
        </Link>
        <span className="doc-title" title={doc.title}>
          {doc.title}
        </span>
        <div className="toolbar">
          <PrintButton />
          <form action={deleteDocumentAction.bind(null, doc.id)}>
            <button className="btn btn-danger" type="submit">
              Delete
            </button>
          </form>
        </div>
      </header>
      <DocumentEditor id={doc.id} initialContent={doc.content} />
    </>
  );
}
