"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SCOPES } from "@/lib/settings-scopes";

/** Tab bar for the settings scopes. Each tab is a real link to its own route,
 * so the active scope survives a reload and can be bookmarked. */
export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="settings-tabs" aria-label="Settings sections">
      {SETTINGS_SCOPES.map((scope) => {
        const active = pathname === scope.href;
        return (
          <Link
            key={scope.id}
            href={scope.href}
            className="settings-tab"
            aria-current={active ? "page" : undefined}
          >
            {scope.label}
          </Link>
        );
      })}
    </nav>
  );
}
