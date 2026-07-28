import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordDigest, PasswordHasher } from "@/domain/access/password";

/**
 * The password, as it may be written down: scrypt over a per-instance random
 * salt. Both comparisons go through `timingSafeEqual`, so neither a hash nor a
 * secret leaks how far an attempt matched.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

/** Compare two buffers without leaking where they diverged. `timingSafeEqual`
 * throws on a length mismatch, which is itself public information. */
function equal(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export const scryptHasher: PasswordHasher = {
  async digest(password: string): Promise<PasswordDigest> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await scrypt(password, salt, KEY_LENGTH);
    return { salt: salt.toString("hex"), hash: hash.toString("hex") };
  },

  async matches(password: string, digest: PasswordDigest): Promise<boolean> {
    try {
      const attempt = await scrypt(password, Buffer.from(digest.salt, "hex"), KEY_LENGTH);
      return equal(attempt, Buffer.from(digest.hash, "hex"));
    } catch {
      // A salt or hash that is not hex is a corrupt file, not a valid password.
      return false;
    }
  },

  secretsMatch(a: string, b: string): boolean {
    return equal(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  },
};
