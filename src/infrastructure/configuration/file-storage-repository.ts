import "server-only";
import type { SecretCipher } from "@/domain/configuration/secret-cipher";
import {
  DEFAULT_PORTS,
  StorageConnection,
  isStorageDriver,
  type StorageConnectionRecord,
} from "@/domain/configuration/storage-connection";
import type { StorageConnectionRepository } from "@/domain/configuration/storage-repository";
import { patchSettings, readSettings } from "./settings-file";

/**
 * The document store's connection in `settings.json` — the one scope that has
 * to stay file-backed whatever the driver, since it cannot be read from the
 * database it configures. The password is encrypted here and nowhere else.
 */

const DEFAULTS: StorageConnectionRecord = {
  driver: "files",
  host: "localhost",
  port: DEFAULT_PORTS.postgres,
  user: "",
  password: "",
  database: "",
  ssl: false,
};

function fromEnvironment(): StorageConnectionRecord {
  const driver = isStorageDriver(process.env.DOCYFIER_DB_DRIVER)
    ? process.env.DOCYFIER_DB_DRIVER
    : DEFAULTS.driver;
  const port = Number(process.env.DOCYFIER_DB_PORT);
  return {
    driver,
    host: process.env.DOCYFIER_DB_HOST ?? DEFAULTS.host,
    port:
      Number.isInteger(port) && port > 0
        ? port
        : (DEFAULT_PORTS[driver] || DEFAULTS.port),
    user: process.env.DOCYFIER_DB_USER ?? DEFAULTS.user,
    password: process.env.DOCYFIER_DB_PASSWORD ?? DEFAULTS.password,
    database: process.env.DOCYFIER_DB_NAME ?? DEFAULTS.database,
    ssl: process.env.DOCYFIER_DB_SSL === "1" || DEFAULTS.ssl,
  };
}

export class FileStorageRepository implements StorageConnectionRepository {
  constructor(private readonly cipher: SecretCipher) {}

  async load(): Promise<StorageConnection> {
    const saved = ((await readSettings()).storage ?? {}) as Partial<
      StorageConnectionRecord
    >;
    const fallback = fromEnvironment();
    return StorageConnection.restore(
      {
        ...saved,
        password: await this.cipher.decrypt(saved.password ?? fallback.password),
      },
      fallback,
    );
  }

  async save(connection: StorageConnection): Promise<void> {
    const record = connection.toRecord();
    await patchSettings({
      storage: { ...record, password: await this.cipher.encrypt(record.password) },
    });
  }
}
