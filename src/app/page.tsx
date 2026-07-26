import Link from "next/link";
import { listDocuments } from "@/lib/store";
import { GenerateHero } from "@/components/GenerateHero";
import { DocumentList } from "@/components/DocumentList";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const docs = await listDocuments();

  return (
    <>
      <header className="app-header">
        <span className="brand">
          Docy<span>fier</span>
        </span>
        <Link href="/settings" className="btn" title="Settings">
          ⚙ Settings
        </Link>
      </header>

      <main className="picker">
        <GenerateHero />

        <h2 className="picker-heading">Recent documents</h2>
        <DocumentList docs={docs} />
      </main>
    </>
  );
}
