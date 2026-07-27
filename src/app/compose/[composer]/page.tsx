import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { availableComposer } from "@/lib/compose/service";
import { ComposerForm } from "@/components/compose/ComposerForm";

export const dynamic = "force-dynamic";

/** One composer. The form is a client component, but only its declared fields
 * cross the boundary — prompts stay on the server. */
export default async function ComposerPage({
  params,
}: {
  params: Promise<{ composer: string }>;
}) {
  await requireAuth();
  const { composer: composerId } = await params;
  const composer = availableComposer(composerId);
  if (!composer) notFound();

  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          Docy<span>fier</span>
        </Link>
        <Link href="/compose" className="btn">
          ← Compose
        </Link>
      </header>

      <main className="picker settings-page">
        <h1>{composer.label}</h1>
        <p className="lede">{composer.lede}</p>
        <ComposerForm composer={composer} />
      </main>
    </>
  );
}
