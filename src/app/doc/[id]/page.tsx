import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/store";
import { getBrandPresets } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { deleteDocumentAction } from "@/app/actions";
import { BrandMark } from "@/components/BrandMark";
import { DocumentEditor } from "@/components/Editor";
import { OverflowMenu } from "@/components/OverflowMenu";
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
  const presets = await getBrandPresets();

  return (
    <>
      <header className="app-header">
        <BrandMark href="/" />
        <span className="doc-title" title={doc.title}>
          {doc.title}
        </span>
        {/* Nothing competes with the document: every action sits behind the
            overflow, grouped by what it acts on — the document leaving, the
            instance, then the one act that destroys. */}
        <div className="toolbar">
          <OverflowMenu label="More actions">
            <PrintButton className="menu-row" />
            <a
              className="menu-row"
              href={`/api/export/markdown/${doc.id}`}
              download
              role="menuitem"
            >
              ↓ Markdown
            </a>
            <Link className="menu-row" href={`/doc/${doc.id}/export`} role="menuitem">
              Export to another tool…
            </Link>
            <hr className="menu-rule" />
            <Link className="menu-row" href="/settings" role="menuitem">
              ⚙ Settings
            </Link>
            <SignOutButton className="menu-row" />
            <hr className="menu-rule" />
            <form action={deleteDocumentAction.bind(null, doc.id)}>
              <button className="menu-row menu-row-danger" type="submit">
                Delete
              </button>
            </form>
          </OverflowMenu>
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
