import type { PasswordDigest } from "./password";
import type { SessionSigner } from "./session";

/**
 * The credentials that guard the instance, and where they come from.
 *
 * They live next to the settings file and never in the document store: a
 * database the user configures from inside the app must not hold the secret
 * that protects it.
 */

export interface StoredCredentials extends PasswordDigest {
  /** Key the session cookies are signed with. Rotating it ends every session. */
  sessionKey: string;
  updatedAt: string;
}

export interface CredentialsRepository {
  load(): Promise<StoredCredentials | null>;
  /** Write them where only the owner can read them back. */
  save(credentials: StoredCredentials): Promise<void>;
}

/** A fresh session key. Injected so a test states what "random" means. */
export interface SessionKeyGenerator {
  next(): string;
}

/**
 * How a key becomes a signer. Three named constructors rather than one, because
 * the three real sources are not interchangeable: a deployment sets a key as
 * text, the credentials file stores random bytes, and an instance configured by
 * environment alone has no file to store one in and derives a stable key from
 * the password instead. Collapsing them would mean guessing an encoding.
 */
export interface SessionSigning {
  /** The key a deployment set, as the text it set. */
  fromDeployedKey(key: string): SessionSigner;
  /** The random key stored with the credentials. */
  fromStoredKey(sessionKey: string): SessionSigner;
  /** Derived from the password, for an instance with nothing written down. */
  fromPassword(password: string): SessionSigner;
}

/** What the environment may say about access. Read through a port so no use
 * case reaches for `process.env`. */
export interface AccessEnvironment {
  /** A password set by the deployment. It wins over the stored one. */
  password(): string | null;
  /** A session key set by the deployment. It wins over the stored one. */
  sessionKey(): string | null;
  /** `DOCYFIER_AUTH`, verbatim — the rule about it lives in `access-mode.ts`. */
  accessFlag(): string | undefined;
}
