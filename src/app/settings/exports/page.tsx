import { requireAuth } from "@/lib/auth";
import { getExportSettings } from "@/lib/settings";
import { exportTargetInfos } from "@/lib/export/registry";
import { ExportsForm } from "@/components/settings/ExportsForm";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exports — Docyfier" };

export default async function ExportSettingsPage() {
  await requireAuth();
  const settings = await getExportSettings();

  return (
    <>
      <ScopeIntro scope="exports" />
      <ExportsForm targets={exportTargetInfos()} initial={settings} />
    </>
  );
}
