import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { composerInfos } from "@/lib/compose/registry";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export const metadata = { title: "Compose — Docyfier" };

/** The dedicated flows (PLAN.md STEP 8): short-form writing that ends in the
 * clipboard rather than in a document. */
export default async function ComposeIndexPage() {
  await requireAuth();
  const composers = composerInfos();

  return (
    <>
      <header className="app-header">
        <BrandMark href="/" />
        <Link href="/" className="btn">
          ← Documents
        </Link>
      </header>

      <main className="picker settings-page">
        <h1>Compose</h1>
        <p className="lede">Short writing that goes straight into another tool.</p>

        <ul className="compose-list">
          {composers.map((composer) => (
            <li key={composer.id}>
              <Link href={`/compose/${composer.id}`} className="compose-choice">
                <strong>{composer.label}</strong>
                <span className="field-help">{composer.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
