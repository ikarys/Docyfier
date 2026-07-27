import Link from "next/link";
import { listDocuments } from "@/lib/store";
import { requireAuth } from "@/lib/auth";
import { GenerateHero } from "@/components/GenerateHero";
import { DocumentList } from "@/components/DocumentList";
import { logoutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  const docs = await listDocuments();

  return (
    <>
      <header className="app-header">
        <span className="brand">
          Docy<span>fier</span>
        </span>
        <div className="toolbar">
          <Link href="/settings" className="btn" title="Settings">
            ⚙ Settings
          </Link>
          <form action={logoutAction}>
            <button className="btn" type="submit" title="Sign out">
              Sign out
            </button>
          </form>
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
