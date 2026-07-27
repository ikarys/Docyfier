import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/store";
import { requireAuth } from "@/lib/auth";
import { deleteDocumentAction } from "@/app/actions";
import { DocumentEditor } from "@/components/Editor";
import { PrintButton } from "@/components/PrintButton";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
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
          <Link href="/settings" className="btn" title="Settings">
            ⚙
          </Link>
          <a
            className="btn"
            href={`/api/export/markdown/${doc.id}`}
            download
            title="Export as Markdown"
          >
            ↓ MD
          </a>
          <Link
            href={`/doc/${doc.id}/export`}
            className="btn"
            title="Export to another tool"
          >
            Export
          </Link>
          <PrintButton />
          <SignOutButton />
          <form action={deleteDocumentAction.bind(null, doc.id)}>
            <button className="btn btn-danger" type="submit">
              Delete
            </button>
          </form>
        </div>
      </header>
      <DocumentEditor
        id={doc.id}
        initialContent={doc.content}
        initialTheme={doc.theme}
        initialUpdatedAt={doc.updatedAt}
      />
    </>
  );
}
