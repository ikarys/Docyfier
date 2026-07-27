import { isAuthEnabled, isPasswordSet, requireAuth } from "@/lib/auth";
import { ScopeIntro } from "@/components/settings/ScopeIntro";

export const dynamic = "force-dynamic";

export const metadata = { title: "Access — Docyfier" };

/** Read-only view of the auth state. The password itself is set on the login
 * page at first run, or by the environment: a form here could lock the owner
 * out of the very page that holds it. */
export default async function AccessSettingsPage() {
  await requireAuth();
  const enabled = await isAuthEnabled();
  const configured = await isPasswordSet();

  return (
    <>
      <ScopeIntro scope="access" />

      <div className="settings-card">
        <p>
          <strong>{enabled ? "Password protected" : "Open"}</strong> —{" "}
          {enabled
            ? configured
              ? "visitors must sign in with the instance password."
              : "the next visitor is asked to choose the instance password."
            : "anyone who can reach this instance can edit every document."}
        </p>

        {enabled ? null : (
          <p className="field-help">
            Set <code>DOCYFIER_AUTH_PASSWORD</code>, or start the app with{" "}
            <code>DOCYFIER_AUTH=1</code> to pick a password on the next visit.
          </p>
        )}

        {enabled ? (
          <p className="field-help">
            Set <code>DOCYFIER_AUTH=0</code> to run open again. Deleting{" "}
            <code>auth.json</code> also clears the password and every session.
          </p>
        ) : null}
      </div>
    </>
  );
}
