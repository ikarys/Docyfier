import { listAiProviders } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { AiProvidersPanel } from "@/components/settings/AiProvidersPanel";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI providers — Docyfier" };

export default async function AiSettingsPage() {
  await requireAuth();
  const { providers, activeId } = await listAiProviders();

  return (
    <>
      <ScopeIntro scope="ai" />
      <AiProvidersPanel providers={providers} activeId={activeId} />
    </>
  );
}
