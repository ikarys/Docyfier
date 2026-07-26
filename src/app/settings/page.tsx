import Link from "next/link";
import { getAiSettings, getStorageSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/SettingsForm";
import { StorageForm } from "@/components/StorageForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings — Docyfier" };

export default async function SettingsPage() {
  const settings = await getAiSettings();
  const storage = await getStorageSettings();

  return (
    <>
      <header className="app-header">
        <Link href="/" className="brand">
          Docy<span>fier</span>
        </Link>
        <Link href="/" className="btn">
          ← Documents
        </Link>
      </header>

      <main className="picker settings-page">
        <h1>Settings</h1>
        <p className="lede">
          Configure the AI model behind the assistant and where documents are
          stored.
        </p>

        <h2 className="picker-heading">AI model</h2>
        <SettingsForm initial={settings} />

        <h2 className="picker-heading">Document storage</h2>
        <StorageForm initial={storage} />
      </main>
    </>
  );
}
