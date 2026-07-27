import { getAiSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { AiSettingsForm } from "@/components/settings/AiSettingsForm";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI model — Docyfier" };

export default async function AiSettingsPage() {
  await requireAuth();
  const settings = await getAiSettings();

  return (
    <>
      <ScopeIntro scope="ai" />
      <AiSettingsForm initial={settings} />
    </>
  );
}
