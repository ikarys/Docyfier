import { isAuthEnabled } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

/** Sign-out control. Renders nothing when the instance runs without a
 * password, so an open local install shows no dead button. */
export async function SignOutButton() {
  if (!(await isAuthEnabled())) return null;

  return (
    <form action={logoutAction}>
      <button className="btn" type="submit" title="Sign out">
        Sign out
      </button>
    </form>
  );
}
