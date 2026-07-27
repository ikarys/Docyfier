import { redirect } from "next/navigation";
import { SETTINGS_SCOPES } from "@/lib/settings-scopes";

/** `/settings` has no content of its own: it opens the first scope. */
export default function SettingsIndexPage() {
  redirect(SETTINGS_SCOPES[0].href);
}
