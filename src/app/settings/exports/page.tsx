import { requireAuth } from "@/lib/auth";
import { getExportSummary } from "@/lib/settings";
import { secretOptionIds } from "@/lib/export/secret-options";
import { exportTargetInfos } from "@/lib/export/registry";
import { ExportsForm } from "@/components/settings/ExportsForm";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Exports — Docyfier" };

export default async function ExportSettingsPage() {
  await requireAuth();
  const settings = await getExportSummary(secretOptionIds());

  return (
    <>
      <ScopeIntro scope="exports" />
      <ExportsForm targets={exportTargetInfos()} initial={settings} />
    </>
  );
}
