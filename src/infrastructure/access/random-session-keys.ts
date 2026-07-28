import { randomBytes } from "node:crypto";
import type { SessionKeyGenerator } from "@/domain/access/credentials";

/** Session keys, as the random bytes they should be — 256 bits, hex, so the
 * stored form is text and the HMAC key is the bytes behind it. */
export const randomSessionKeys: SessionKeyGenerator = {
  next: () => randomBytes(32).toString("hex"),
};
