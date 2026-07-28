/**
 * The one rule about the password itself, and the ports that turn it into
 * something storable.
 */

export const MIN_PASSWORD_LENGTH = 10;

export class WeakPassword extends Error {
  constructor(readonly minimum: number) {
    // No part of the attempt appears here: this message is allowed to travel.
    super(`Password must be at least ${minimum} characters.`);
    this.name = "WeakPassword";
  }
}

/** Refuse a password nothing should be protected by. */
export function requireUsablePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) throw new WeakPassword(MIN_PASSWORD_LENGTH);
}

/** A password as it may be written down: a salt and the hash under it. */
export interface PasswordDigest {
  salt: string;
  hash: string;
}

export interface PasswordHasher {
  /** This password under a fresh salt. */
  digest(password: string): Promise<PasswordDigest>;
  /** Whether the password produces this digest. */
  matches(password: string, digest: PasswordDigest): Promise<boolean>;
  /**
   * Whether two secrets are the same. Here rather than at the call site because
   * `===` on a secret leaks how far it matched, and how to compare without
   * leaking that is the adapter's business — it is the same comparison
   * `matches` already has to make.
   */
  secretsMatch(a: string, b: string): boolean;
}
