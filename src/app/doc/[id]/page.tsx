import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/store";
import { getBrandPresets, listAiProviders } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { deleteDocumentAction } from "@/app/actions";
import { BrandMark } from "@/components/BrandMark";
import { DocumentEditor } from "@/components/Editor";
import { ModelSwitcher } from "@/components/ModelSwitcher";
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
  const [ai, presets] = await Promise.all([listAiProviders(), getBrandPresets()]);

  return (
    <>
      <header className="app-header">
        <BrandMark href="/" />
        <span className="doc-title" title={doc.title}>
          {doc.title}
        </span>
        <div className="toolbar">
          <ModelSwitcher providers={ai.providers} activeId={ai.activeId} />
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
        presets={presets}
      />
    </>
  );
}
