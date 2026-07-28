/**
 * A session is an expiry this instance signed (PLAN.md STEP 4).
 *
 * Stateless on purpose: no session table has to exist before multi-tenancy, and
 * an instance that loses its key logs everybody out rather than honouring a
 * cookie it can no longer account for. Two things have to hold, and both are
 * checked below — the expiry is in the future, and the signature is ours.
 */

/** How long a browser stays logged in. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** The separator between the two fields of a cookie value. */
const FIELD = ".";

export interface SessionSigner {
  sign(value: string): string;
  /**
   * Whether `signature` is what this signer produces for `value`. A comparison
   * that leaks timing is an adapter's problem to avoid, not this file's.
   */
  matches(value: string, signature: string): boolean;
}

export class Session {
  private constructor(readonly expiresAt: number) {}

  /** A session opening now. */
  static issue(now: number): Session {
    return new Session(now + SESSION_TTL_MS);
  }

  /**
   * The session a cookie stands for, or `null` when it stands for nothing this
   * instance would honour.
   */
  static verify(
    raw: string | null | undefined,
    now: number,
    signer: SessionSigner,
  ): Session | null {
    if (!raw) return null;

    // Exactly two fields: a token carrying more is not one we wrote, and
    // reading only the first two would honour whatever was appended.
    const fields = raw.split(FIELD);
    if (fields.length !== 2) return null;

    const [expiry, signature] = fields;
    if (!expiry || !signature) return null;

    // Integer, so "1e999", " 12" and "Infinity" are all refused before the
    // arithmetic below could turn one of them into a session that never ends.
    if (!/^\d+$/.test(expiry)) return null;

    const expiresAt = Number(expiry);
    if (expiresAt <= now) return null;

    // Only now: verifying a signature costs more than comparing two numbers.
    return signer.matches(expiry, signature) ? new Session(expiresAt) : null;
  }

  /** What goes in the cookie. */
  toCookieValue(signer: SessionSigner): string {
    const expiry = String(this.expiresAt);
    return `${expiry}${FIELD}${signer.sign(expiry)}`;
  }

  /** The lifetime a cookie is set with, in the unit it wants. */
  get ttlSeconds(): number {
    return SESSION_TTL_MS / 1000;
  }
}
