import type { ReactNode } from "react";
import Link from "next/link";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

/** Chrome shared by every settings scope: the app header, the title and the
 * tab bar. Each scope page renders only its own section. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
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
        <SettingsTabs />
        {children}
      </main>
    </>
  );
}
