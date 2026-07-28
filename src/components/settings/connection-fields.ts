import {
  DEFAULT_PORTS,
  type StorageDriver,
  type StorageSettingsSummary,
} from "@/lib/settings-types";
import { noSecretTyped, type WriteOnlySecret } from "./write-only-secret";

/**
 * What the storage form holds while it is being edited, and the rules that
 * decide what a change means.
 *
 * A port the user never chose follows the driver — a rule a reader would not
 * guess, so it lives here where a test can state it rather than inside a change
 * handler. The password obeys the rule every stored credential obeys, in
 * `write-only-secret`.
 */
export interface ConnectionFields {
  driver: StorageDriver;
  host: string;
  /** Kept as text: the field is an input, and an empty one is not a zero. */
  port: string;
  user: string;
  database: string;
  password: WriteOnlySecret;
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
    password: noSecretTyped(),
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
