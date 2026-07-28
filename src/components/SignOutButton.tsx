import { isAuthEnabled } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

/** Sign-out control. Renders nothing when the instance runs without a
 * password, so an open local install shows no dead button. The caller says how
 * it is dressed: a toolbar button on its own, a row inside a menu. */
export async function SignOutButton({ className = "btn" }: { className?: string }) {
  if (!(await isAuthEnabled())) return null;

  return (
    <form action={logoutAction}>
      <button className={className} type="submit" title="Sign out">
        Sign out
      </button>
    </form>
  );
}
