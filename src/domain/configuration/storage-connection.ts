/**
 * Where documents live: the driver and, for a database, how to reach it.
 *
 * These rules used to live in a server action, which is why the form and the
 * "test connection" button each re-typed them. They belong to the connection
 * itself: what a file store ignores, what a database cannot do without, and
 * which port a stock server listens on.
 */

/** `files` is the default on-disk store (STEP 0). */
export type StorageDriver = "files" | "postgres" | "mysql";

export const STORAGE_DRIVERS: StorageDriver[] = ["files", "postgres", "mysql"];

export const DEFAULT_PORTS: Record<StorageDriver, number> = {
  files: 0,
  postgres: 5432,
  mysql: 3306,
};

export function isStorageDriver(value: unknown): value is StorageDriver {
  return STORAGE_DRIVERS.includes(value as StorageDriver);
}

/** The persisted shape — what a settings repository reads and writes. */
export interface StorageConnectionRecord {
  driver: StorageDriver;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

/** What the browser gets: the connection minus its password. */
export type StorageConnectionSummary = Omit<StorageConnectionRecord, "password"> & {
  hasPassword: boolean;
};

export class InvalidConnection extends Error {
  constructor(
    readonly field: keyof StorageConnectionRecord,
    message: string,
  ) {
    super(message);
    this.name = "InvalidConnection";
  }
}

/** Anything a user may submit: strings from a form, gaps included. */
export type ConnectionInput = Partial<Omit<StorageConnectionRecord, "driver">> & {
  driver: unknown;
};

const FILE_STORE: StorageConnectionRecord = {
  driver: "files",
  host: "",
  port: 0,
  user: "",
  password: "",
  database: "",
  ssl: false,
};

function required(value: unknown, field: keyof StorageConnectionRecord): string {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new InvalidConnection(field, `${field[0].toUpperCase()}${field.slice(1)} is required.`);
  }
  return text;
}

export class StorageConnection {
  private constructor(private readonly record: StorageConnectionRecord) {}

  /** A connection as a user just entered it. Invalid input is refused, not fixed. */
  static create(input: ConnectionInput): StorageConnection {
    if (!isStorageDriver(input.driver)) {
      throw new InvalidConnection("driver", "Unknown storage driver.");
    }
    if (input.driver === "files") {
      // A host or a password entered against the file store is meaningless, and
      // keeping it would leave a credential nothing uses.
      return new StorageConnection(FILE_STORE);
    }

    const port = Number(input.port ?? DEFAULT_PORTS[input.driver]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new InvalidConnection("port", "Port must be an integer between 1 and 65535.");
    }
    return new StorageConnection({
      driver: input.driver,
      host: required(input.host, "host"),
      port,
      user: required(input.user, "user"),
      password: String(input.password ?? ""),
      database: required(input.database, "database"),
      ssl: Boolean(input.ssl),
    });
  }

  /**
   * A connection as it was stored, over the values the environment provides.
   * Nothing validated that file, so every unusable field falls back rather than
   * throwing: the settings page has to stay reachable.
   */
  static restore(
    stored: Partial<Omit<StorageConnectionRecord, "driver">> & { driver?: unknown },
    fallback: StorageConnectionRecord,
  ): StorageConnection {
    const driver = isStorageDriver(stored.driver) ? stored.driver : fallback.driver;
    const port =
      Number.isInteger(stored.port) && (stored.port as number) > 0
        ? (stored.port as number)
        : DEFAULT_PORTS[driver] || fallback.port;
    return new StorageConnection({
      driver,
      host: stored.host?.trim() || fallback.host,
      port,
      user: stored.user ?? fallback.user,
      password: stored.password ?? fallback.password,
      database: stored.database?.trim() || fallback.database,
      ssl: stored.ssl ?? fallback.ssl,
    });
  }

  get driver(): StorageDriver {
    return this.record.driver;
  }

  get host(): string {
    return this.record.host;
  }

  get port(): number {
    return this.record.port;
  }

  get password(): string {
    return this.record.password;
  }

  /** True when saving it blind would be reckless: a database has to answer
   * first, or a typo takes the whole app down on the next page load. */
  get needsConnecting(): boolean {
    return this.record.driver !== "files";
  }

  withPassword(password: string): StorageConnection {
    return new StorageConnection({ ...this.record, password });
  }

  toRecord(): StorageConnectionRecord {
    return { ...this.record };
  }

  toSummary(): StorageConnectionSummary {
    const { password, ...rest } = this.record;
    return { ...rest, hasPassword: password.length > 0 };
  }
}
