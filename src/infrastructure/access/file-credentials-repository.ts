import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CredentialsRepository,
  StoredCredentials,
} from "@/domain/access/credentials";

/**
 * The credentials, in a file next to the settings rather than in the document
 * store: a database the user configures from inside the app must not hold the
 * secret that protects it.
 *
 * The on-disk key for the session key is `secret`, which is what instances
 * already have on disk. Renaming it here would log every existing instance out
 * and, worse, look like a corrupt file rather than a migration.
 */

interface AuthFileShape {
  salt: string;
  hash: string;
  secret: string;
  updatedAt: string;
}

export class FileCredentialsRepository implements CredentialsRepository {
  constructor(private readonly file: string) {}

  /** Where an instance keeps it: beside the document directory, not inside. */
  static beside(documentsDir: string): FileCredentialsRepository {
    return new FileCredentialsRepository(
      path.join(path.dirname(documentsDir), "auth.json"),
    );
  }

  async load(): Promise<StoredCredentials | null> {
    try {
      const raw = JSON.parse(await readFile(this.file, "utf8")) as Partial<AuthFileShape>;
      if (!raw.salt || !raw.hash || !raw.secret) return null;
      return {
        salt: raw.salt,
        hash: raw.hash,
        sessionKey: raw.secret,
        updatedAt: raw.updatedAt ?? "",
      };
    } catch {
      // No file, unreadable, or not JSON: an instance with no credentials.
      return null;
    }
  }

  async save(credentials: StoredCredentials): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const shape: AuthFileShape = {
      salt: credentials.salt,
      hash: credentials.hash,
      secret: credentials.sessionKey,
      updatedAt: credentials.updatedAt,
    };
    // Owner-only: the file holds the password hash and the session key.
    await writeFile(this.file, JSON.stringify(shape, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
  }
}
