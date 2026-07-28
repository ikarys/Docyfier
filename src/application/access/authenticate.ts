import { accessEnabled } from "@/domain/access/access-mode";
import { requireUsablePassword } from "@/domain/access/password";
import type { AccessDeps } from "./deps";

/**
 * Deciding whether a password is the one, and choosing it in the first place.
 *
 * The lockout is applied here rather than in the form: it is the rule that makes
 * guessing impractical, and a caller must not be able to skip it by calling the
 * check directly.
 */

export type LoginResult = "ok" | "invalid" | "locked" | "unconfigured";

/** True once this instance has credentials, from the deployment or from disk. */
export async function credentialsExist(deps: AccessDeps): Promise<boolean> {
  return deps.environment.password() !== null || (await deps.credentials.load()) !== null;
}

/** Whether the caller has to prove who they are at all. */
export async function accessRequired(deps: AccessDeps): Promise<boolean> {
  return accessEnabled(deps.environment.accessFlag(), await credentialsExist(deps));
}

/**
 * Store a new password. Rotating it also rotates the session key, so every
 * session the old password authorised dies with it, and clears the lockout —
 * whoever can set the password has already proved they own the instance.
 */
export async function choosePassword(deps: AccessDeps, password: string): Promise<void> {
  requireUsablePassword(password);
  const digest = await deps.hasher.digest(password);
  await deps.credentials.save({
    ...digest,
    sessionKey: deps.keys.next(),
    updatedAt: deps.clock.now(),
  });
  deps.attempts.write(deps.attempts.read().succeeded());
}

/** Check a password attempt, applying the lockout. */
export async function checkPassword(
  deps: AccessDeps,
  password: string,
): Promise<LoginResult> {
  const now = deps.clock.epochMs();
  // Before anything else: while locked, even the right password is refused, so
  // guessing cannot be run alongside a correct attempt.
  if (deps.attempts.read().isLocked(now)) return "locked";

  const accepted = await passwordAccepted(deps, password);
  if (accepted === null) return "unconfigured";

  const attempts = deps.attempts.read();
  deps.attempts.write(accepted ? attempts.succeeded() : attempts.failed(now));
  return accepted ? "ok" : "invalid";
}

/** Whether the password is the one, or `null` when there is nothing to compare
 * it against. The deployment's password wins over the stored digest. */
async function passwordAccepted(
  deps: AccessDeps,
  password: string,
): Promise<boolean | null> {
  const deployed = deps.environment.password();
  if (deployed !== null) return deps.hasher.secretsMatch(password, deployed);

  const stored = await deps.credentials.load();
  if (!stored) return null;
  return deps.hasher.matches(password, stored);
}
