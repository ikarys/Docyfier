import { describe, expect, it } from "vitest";
import { connectionFrom, withDriver, type ConnectionFields } from "./connection-fields";
import { DEFAULT_PORTS } from "@/lib/settings-types";

const saved = {
  driver: "postgres" as const,
  host: "db.local",
  port: 5432,
  user: "docyfier",
  database: "docyfier",
  ssl: true,
  hasPassword: true,
};

describe("opening the form on what is saved", () => {
  it("shows the saved connection, never the password", () => {
    const fields = connectionFrom(saved);
    expect(fields).toMatchObject({ host: "db.local", port: "5432", ssl: true });
    expect(fields.password).toEqual({ value: "", cleared: false });
  });

  it("offers PostgreSQL's port to an instance still on files", () => {
    expect(connectionFrom({ ...saved, driver: "files", port: 0 }).port).toBe(
      String(DEFAULT_PORTS.postgres),
    );
  });
});

describe("changing the backend", () => {
  const on = (fields: Partial<ConnectionFields>) => ({ ...connectionFrom(saved), ...fields });

  it("follows the new driver's default port", () => {
    expect(withDriver(on({ port: "5432" }), "mysql").port).toBe(
      String(DEFAULT_PORTS.mysql),
    );
  });

  it("leaves a port the user typed alone", () => {
    expect(withDriver(on({ port: "6543" }), "mysql").port).toBe("6543");
  });

  it("keeps the port as it is when moving to files, which has none", () => {
    expect(withDriver(on({ port: "5432" }), "files").port).toBe("5432");
  });
});
