import type { SessionSigner } from "@/domain/access/session";
import { Session } from "@/domain/access/session";
import type { AccessDeps } from "./deps";

/**
 * Opening a session and reading one back.
 *
 * The only decision here is which key signs it, and the order matters: the
 * deployment's key wins so an operator can force every session to be
 * re-established, the stored key comes next, and an instance whose password
 * comes from the environment alone derives a stable key from it — there is no
 * file to keep one in, and a restart must not log everybody out.
 */

export class NoCredentials extends Error {
  constructor() {
    super("No credentials configured");
    this.name = "NoCredentials";
  }
}

export interface OpenedSession {
  cookieValue: string;
  ttlSeconds: number;
}

export async function openSession(deps: AccessDeps): Promise<OpenedSession> {
  const signer = await signerFor(deps);
  if (!signer) throw new NoCredentials();

  const session = Session.issue(deps.clock.epochMs());
  return { cookieValue: session.toCookieValue(signer), ttlSeconds: session.ttlSeconds };
}

/** Whether a cookie value stands for a session this instance would honour. */
export async function sessionIsValid(
  deps: AccessDeps,
  cookieValue: string | null | undefined,
): Promise<boolean> {
  const signer = await signerFor(deps);
  if (!signer) return false;
  return Session.verify(cookieValue, deps.clock.epochMs(), signer) !== null;
}

async function signerFor(deps: AccessDeps): Promise<SessionSigner | null> {
  const deployed = deps.environment.sessionKey();
  if (deployed) return deps.signing.fromDeployedKey(deployed);

  const stored = await deps.credentials.load();
  if (stored) return deps.signing.fromStoredKey(stored.sessionKey);

  const password = deps.environment.password();
  return password ? deps.signing.fromPassword(password) : null;
}
