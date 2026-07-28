import {
  DEFAULT_PORTS,
  type StorageDriver,
  type StorageSettingsSummary,
} from "@/lib/settings-types";

/**
 * What the storage form holds while it is being edited, and the rules that
 * decide what a change means.
 *
 * Ports and passwords both behave in ways a reader would not guess: a port the
 * user never chose follows the driver, and an empty password field means "keep
 * the stored one" rather than "no password". Both rules live here, where a test
 * can state them, and not inside a change handler.
 */
export interface ConnectionFields {
  driver: StorageDriver;
  host: string;
  /** Kept as text: the field is an input, and an empty one is not a zero. */
  port: string;
  user: string;
  database: string;
  password: string;
  passwordCleared: boolean;
  ssl: boolean;
}

export function connectionFrom(initial: StorageSettingsSummary): ConnectionFields {
  return {
    driver: initial.driver,
    host: initial.host,
    port: String(initial.port || DEFAULT_PORTS.postgres),
    user: initial.user,
    database: initial.database,
    ssl: initial.ssl,
    password: "",
    passwordCleared: false,
  };
}

/** A port nobody chose follows the driver; one the user typed is theirs. */
export function withDriver(
  fields: ConnectionFields,
  driver: StorageDriver,
): ConnectionFields {
  const untouched = Object.values(DEFAULT_PORTS).includes(Number(fields.port));
  const port =
    driver !== "files" && untouched ? String(DEFAULT_PORTS[driver]) : fields.port;
  return { ...fields, driver, port };
}

/** Typing a password takes back a pending removal — the intent is to replace it. */
export function withPassword(
  fields: ConnectionFields,
  password: string,
): ConnectionFields {
  return { ...fields, password, passwordCleared: password ? false : fields.passwordCleared };
}

export function withClearedPassword(fields: ConnectionFields): ConnectionFields {
  return { ...fields, passwordCleared: true };
}

/** Removing a stored password is only offered while nothing else would replace it. */
export function offersToForgetPassword(
  fields: ConnectionFields,
  initial: { hasPassword: boolean },
): boolean {
  return initial.hasPassword && !fields.passwordCleared && !fields.password;
}
