import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTS,
  InvalidConnection,
  STORAGE_DRIVERS,
  StorageConnection,
  isStorageDriver,
} from "./storage-connection";

const database = {
  driver: "postgres" as const,
  host: "db.example.com",
  port: 5432,
  user: "docyfier",
  password: "hunter2",
  database: "docs",
  ssl: true,
};

/**
 * The connection to the document store. Everything below used to sit in a
 * server action, which is why the same rules were re-typed for the form and for
 * the "test connection" button.
 */
describe("StorageConnection.create", () => {
  it("keeps a complete database connection", () => {
    const connection = StorageConnection.create(database);
    expect(connection.toRecord()).toEqual(database);
  });

  it("refuses a driver this build does not ship", () => {
    expect(() => StorageConnection.create({ ...database, driver: "sqlite" })).toThrow(
      InvalidConnection,
    );
  });

  it("requires what a database needs to be reached", () => {
    expect(() => StorageConnection.create({ ...database, host: " " })).toThrow(
      InvalidConnection,
    );
    expect(() => StorageConnection.create({ ...database, user: "" })).toThrow(
      InvalidConnection,
    );
    expect(() => StorageConnection.create({ ...database, database: "" })).toThrow(
      InvalidConnection,
    );
  });

  it("refuses a port outside the range a port can have", () => {
    expect(() => StorageConnection.create({ ...database, port: 0 })).toThrow(
      InvalidConnection,
    );
    expect(() => StorageConnection.create({ ...database, port: 70000 })).toThrow(
      InvalidConnection,
    );
  });

  it("falls back to the standard port of the driver, so a stock server needs none", () => {
    expect(
      StorageConnection.create({ ...database, driver: "mysql", port: undefined }).port,
    ).toBe(DEFAULT_PORTS.mysql);
  });

  /** The file store answers from the data volume: a host or a password entered
   * against it is meaningless, and keeping it would be a credential nobody uses. */
  it("blanks everything a file store does not use", () => {
    const connection = StorageConnection.create({ ...database, driver: "files" });
    expect(connection.toRecord()).toEqual({
      driver: "files",
      host: "",
      port: 0,
      user: "",
      password: "",
      database: "",
      ssl: false,
    });
  });

  it("says whether it has to be reached before it is worth saving", () => {
    expect(StorageConnection.create(database).needsConnecting).toBe(true);
    expect(
      StorageConnection.create({ ...database, driver: "files" }).needsConnecting,
    ).toBe(false);
  });
});

describe("the drivers this build ships", () => {
  it("are the only ones a form value can name", () => {
    for (const driver of STORAGE_DRIVERS) expect(isStorageDriver(driver)).toBe(true);
    for (const other of ["sqlite", "", undefined, null, 1]) {
      expect(isStorageDriver(other)).toBe(false);
    }
  });

  it("each declare the standard port, so a stock database needs none typed", () => {
    expect(DEFAULT_PORTS.postgres).toBe(5432);
    expect(DEFAULT_PORTS.mysql).toBe(3306);
    for (const driver of STORAGE_DRIVERS) {
      expect(DEFAULT_PORTS[driver]).toBeTypeOf("number");
    }
  });
});

describe("a stored connection", () => {
  it("repairs a settings file nobody validated", () => {
    const connection = StorageConnection.restore(
      { driver: "nonsense", port: -1, host: "  " },
      database,
    );
    expect(connection.driver).toBe("postgres");
    expect(connection.host).toBe("db.example.com");
    expect(connection.port).toBe(5432);
  });

  it("never lets the password reach a summary", () => {
    const summary = StorageConnection.create(database).toSummary();
    expect(summary).not.toHaveProperty("password");
    expect(summary.hasPassword).toBe(true);
    expect(
      StorageConnection.create({ ...database, password: "" }).toSummary().hasPassword,
    ).toBe(false);
  });

  it("takes a password it was not given back", () => {
    expect(StorageConnection.create(database).withPassword("other").password).toBe(
      "other",
    );
  });
});
