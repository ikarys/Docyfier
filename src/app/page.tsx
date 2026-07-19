import Link from "next/link";
import { listDocuments } from "@/lib/store";
import { deleteDocumentAction } from "./actions";
import { GenerateHero } from "@/components/GenerateHero";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function HomePage() {
  const docs = await listDocuments();

  return (
    <>
      <header className="app-header">
        <span className="brand">
          Docy<span>fier</span>
        </span>
      </header>

      <main className="picker">
        <GenerateHero />

        <h2 className="picker-heading">Recent documents</h2>
        {docs.length === 0 ? (
          <div className="empty-state">
            No documents yet. Describe one above, or start from a blank page.
          </div>
        ) : (
          docs.map((doc) => (
            <div key={doc.id} className="doc-card">
              <Link href={`/doc/${doc.id}`} className="doc-card-main">
                <span className="doc-card-title">{doc.title}</span>
                <span className="doc-card-slug">
                  edited {formatDate(doc.updatedAt)}
                </span>
              </Link>
              <form action={deleteDocumentAction.bind(null, doc.id)}>
                <button className="btn btn-danger" type="submit" title="Delete">
                  Delete
                </button>
              </form>
            </div>
          ))
        )}
      </main>
    </>
  );
}
