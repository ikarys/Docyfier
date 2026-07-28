import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { SecretCipher } from "@/domain/configuration/secret-cipher";

/**
 * The `SecretCipher` adapter: encryption of the secrets the app stores on disk
 * (LLM API keys, the database password, export options a target declares
 * secret).
 *
 * The settings file sits in the data volume next to the documents, so anything
 * copied out of that volume — a backup, a stray container image — would
 * otherwise carry usable cloud credentials in clear text.
 *
 * AES-256-GCM, key from `DOCYFIER_SECRET_KEY` or from a per-instance key file.
 * The auth file's session secret is deliberately not reused: rotating the
 * password rotates it, which would make every stored key unreadable.
 */

const PREFIX = "v1";

function keyFile(): string {
  const dir =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(dir), "secret.key");
}

/** The 32-byte key from the environment, if the deployment provides one. */
function envKey(): Buffer | null {
  const raw = process.env.DOCYFIER_SECRET_KEY?.trim();
  if (!raw) return null;
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, "hex")
    : Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "DOCYFIER_SECRET_KEY must be 32 bytes, hex- or base64-encoded (e.g. `openssl rand -hex 32`).",
    );
  }
  return buf;
}

let cached: Buffer | null = null;

/**
 * The encryption key. Generated on first use when the environment does not
 * provide one, so a local run needs no setup — the file then belongs to the
 * data volume and has to be backed up with it.
 */
async function secretKey(): Promise<Buffer> {
  if (cached) return cached;
  const fromEnv = envKey();
  if (fromEnv) {
    cached = fromEnv;
    return fromEnv;
  }

  const file = keyFile();
  try {
    const key = Buffer.from((await readFile(file, "utf8")).trim(), "hex");
    if (key.length === 32) {
      cached = key;
      return key;
    }
  } catch {
    // No key yet: fall through and create one.
  }

  const key = randomBytes(32);
  await mkdir(path.dirname(file), { recursive: true });
  // Owner-only: this file decrypts every stored credential.
  await writeFile(file, key.toString("hex"), { encoding: "utf8", mode: 0o600 });
  cached = key;
  return key;
}

/** Forget the cached key (the env var may have changed between runs of a test). */
export function clearSecretKeyCache(): void {
  cached = null;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}.`);
}

/** Encrypt a secret for storage. An empty secret stays empty — there is nothing
 * to hide, and a marker would only make the file harder to read. */
export async function encryptSecret(plain: string): Promise<string> {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", await secretKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    PREFIX,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}

/**
 * Read a stored secret. Values written before this module existed have no
 * prefix and are returned as-is, so an upgrade keeps working and the value is
 * encrypted on the next save.
 */
export async function decryptSecret(stored: string): Promise<string> {
  if (!stored || !isEncrypted(stored)) return stored;
  const [, iv, tag, data] = stored.split(".");
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      await secretKey(),
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Never fall back to an empty key: that would silently send unauthenticated
    // requests to a provider instead of saying what actually broke.
    throw new Error(
      "A stored API key cannot be decrypted — did DOCYFIER_SECRET_KEY or data/secret.key change? Re-enter the key in Settings.",
    );
  }
}

/** The port as one object, for a composition root to inject. */
export const aesGcmCipher: SecretCipher = {
  encrypt: encryptSecret,
  decrypt: decryptSecret,
  isEncrypted,
};
