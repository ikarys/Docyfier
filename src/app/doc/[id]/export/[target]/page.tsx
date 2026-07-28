import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getDocument } from "@/lib/store";
import { availableExportTarget, renderExport } from "@/lib/export/service";
import { exportFilename } from "@/domain/publishing/export-filename";
import { BrandMark } from "@/components/BrandMark";
import { CopyBox } from "@/components/CopyBox";

export const dynamic = "force-dynamic";

/** The payload for one target: copied from the page, or downloaded as a file.
 * Rendering happens on the server so no target code reaches the browser — and a
 * binary target is not rendered here at all, since only the download route
 * needs its bytes. */
export default async function ExportTargetPage({
  params,
}: {
  params: Promise<{ id: string; target: string }>;
}) {
  await requireAuth();
  const { id, target: targetId } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const target = await availableExportTarget(targetId);
  if (!target) notFound();

  const filename = exportFilename(doc.title, target.extension);
  const rendered = target.binary ? null : await renderExport(doc, targetId);

  return (
    <>
      <header className="app-header">
        <BrandMark href="/" />
        <div className="toolbar">
          <Link href={`/doc/${id}/export`} className="btn">
            ← Targets
          </Link>
        </div>
      </header>

      <main className="picker settings-page">
        <h1>{target.label}</h1>
        <p className="lede">{target.instructions}</p>

        {rendered ? (
          <>
            <p>
              <a className="btn" href={`/api/export/${targetId}/${id}`} download>
                ↓ {filename}
              </a>
            </p>
            <CopyBox payload={rendered.payload as string} />
          </>
        ) : (
          <a className="btn btn-primary" href={`/api/export/${targetId}/${id}`} download>
            ↓ Download {filename}
          </a>
        )}
      </main>
    </>
  );
}
