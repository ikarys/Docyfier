import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionSigning } from "@/domain/access/credentials";
import type { SessionSigner } from "@/domain/access/session";

/**
 * Session cookies, signed with HMAC-SHA256.
 *
 * Two ways to key it. `fromKey` uses the random key stored with the credentials.
 * `fromPassword` derives one for an instance configured by environment alone:
 * there is no file to keep a key in, and a key regenerated per boot would log
 * everybody out on every restart.
 */

/** Domain separation for the derived key: this HMAC is a key-derivation step,
 * not a signature, and must never collide with one. */
const DERIVATION_LABEL = "docyfier-session";

export const hmacSessionSigning: SessionSigning = {
  fromDeployedKey: (key) => signerWith(Buffer.from(key, "utf8")),
  fromStoredKey: (sessionKey) => signerWith(Buffer.from(sessionKey, "hex")),
  fromPassword: (password) =>
    signerWith(createHmac("sha256", DERIVATION_LABEL).update(password).digest()),
};

function signerWith(key: Buffer): SessionSigner {
  const sign = (value: string): string =>
    createHmac("sha256", key).update(value).digest("base64url");

  return {
    sign,
    matches(value, signature) {
      const expected = Buffer.from(sign(value), "base64url");
      const given = Buffer.from(signature, "base64url");
      // Length first: `timingSafeEqual` throws when they differ, and a signature
      // of the wrong length is refused without telling anyone anything.
      return given.length === expected.length && timingSafeEqual(given, expected);
    },
  };
}
