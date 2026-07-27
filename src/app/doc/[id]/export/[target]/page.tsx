import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDocument } from "@/lib/store";
import { renderExport } from "@/lib/export/service";
import { CopyBox } from "@/components/CopyBox";

export const dynamic = "force-dynamic";

/** The rendered payload for one target: copy it, or download it as a file.
 * Rendering happens on the server so no target code reaches the browser. */
export default async function ExportTargetPage({
  params,
}: {
  params: Promise<{ id: string; target: string }>;
}) {
  await requireAuth();
  const { id, target: targetId } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const result = await renderExport(doc, targetId);
  if (!result) notFound();

  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          Docy<span>fier</span>
        </Link>
        <div className="toolbar">
          <a className="btn" href={`/api/export/${targetId}/${id}`} download>
            ↓ {result.filename}
          </a>
          <Link href={`/doc/${id}/export`} className="btn">
            ← Targets
          </Link>
        </div>
      </header>

      <main className="picker settings-page">
        <h1>{result.target.label}</h1>
        <p className="lede">{result.target.instructions}</p>
        <CopyBox payload={result.payload} />
      </main>
    </>
  );
}
