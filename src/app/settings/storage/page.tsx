import { getStorageSettings } from "@/lib/settings";
import { requireAuth } from "@/lib/auth";
import { StorageForm } from "@/components/settings/StorageForm";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Storage — Docyfier" };

export default async function StorageSettingsPage() {
  await requireAuth();
  const storage = await getStorageSettings();

  return (
    <>
      <ScopeIntro scope="storage" />
      <StorageForm initial={storage} />
    </>
  );
}
