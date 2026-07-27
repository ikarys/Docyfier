import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDocument } from "@/lib/store";
import { enabledExportTargets } from "@/lib/export/service";

export const dynamic = "force-dynamic";

/** The export targets available for one document. Empty until the user enables
 * a target in Settings, which is where this page sends them. */
export default async function ExportIndexPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const targets = await enabledExportTargets();

  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          Docy<span>fier</span>
        </Link>
        <Link href={`/doc/${id}`} className="btn">
          ← Back to the document
        </Link>
      </header>

      <main className="picker settings-page">
        <h1>Export</h1>
        <p className="lede">{doc.title}</p>

        {targets.length === 0 ? (
          <p className="field-help">
            No export target is enabled. Turn one on in{" "}
            <Link href="/settings/exports">Settings → Exports</Link>.
          </p>
        ) : (
          <ul className="export-list">
            {targets.map((target) => (
              <li key={target.id}>
                <Link href={`/doc/${id}/export/${target.id}`} className="export-choice">
                  <strong>{target.label}</strong>
                  <span className="field-help">{target.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
