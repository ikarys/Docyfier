import Link from "next/link";
import { listDocuments } from "@/lib/store";
import { listAiProviders } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { GenerateHero } from "@/components/GenerateHero";
import { ModelSwitcher } from "@/components/ModelSwitcher";
import { DocumentList } from "@/components/DocumentList";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await requireAuth();
  const [docs, ai] = await Promise.all([listDocuments(), listAiProviders()]);

  return (
    <>
      <header className="app-header">
        <span className="brand">
          Docy<span>fier</span>
        </span>
        <div className="toolbar">
          <ModelSwitcher providers={ai.providers} activeId={ai.activeId} />
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
