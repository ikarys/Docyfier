/**
 * The settings scopes, in tab order. Single source of truth for the navigation
 * and the routes under `/settings`: adding a scope means adding an entry here
 * and the matching page segment, nothing else.
 *
 * Client-safe on purpose — the tab bar is a client component, so this module
 * must not pull in `server-only` settings code.
 */
export interface SettingsScope {
  id: string;
  label: string;
  href: string;
  /** One line under the page title, explaining what this scope covers. */
  lede: string;
}

export const SETTINGS_SCOPES: SettingsScope[] = [
  {
    id: "ai",
    label: "AI model",
    href: "/settings/ai",
    lede: "The model behind the assistant, and the server that serves it.",
  },
  {
    id: "storage",
    label: "Storage",
    href: "/settings/storage",
    lede: "Where documents live: files, PostgreSQL or MySQL.",
  },
  {
    id: "exports",
    label: "Exports",
    href: "/settings/exports",
    lede: "The tools your documents can be exported to.",
  },
  {
    id: "access",
    label: "Access",
    href: "/settings/access",
    lede: "Who can reach this instance.",
  },
];

export function findScope(id: string): SettingsScope | undefined {
  return SETTINGS_SCOPES.find((scope) => scope.id === id);
}
