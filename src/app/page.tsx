import Link from "next/link";
import { listDocuments } from "@/lib/store";
import { requireAuth } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { GenerateHero } from "@/components/GenerateHero";
import { DocumentList } from "@/components/DocumentList";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  const docs = await listDocuments();

  return (
    <>
      <header className="app-header">
        <BrandMark />
        <div className="toolbar">
          <Link href="/compose" className="btn" title="Email and ticket composers">
            ✎ Compose
          </Link>
          <Link href="/settings" className="btn" title="Settings">
            ⚙ Settings
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="picker">
        <GenerateHero />

        <h2 className="picker-heading">Recent documents</h2>
        <DocumentList docs={docs} />
      </main>
    </>
  );
}
