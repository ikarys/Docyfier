import { describe, expect, it } from "vitest";
import {
  connectionFrom,
  offersToForgetPassword,
  withClearedPassword,
  withDriver,
  withPassword,
  type ConnectionFields,
} from "./connection-fields";
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
    expect(fields.password).toBe("");
    expect(fields.passwordCleared).toBe(false);
  });

  it("offers PostgreSQL's port to a instance still on files", () => {
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

describe("the write-only password", () => {
  const fields = connectionFrom(saved);

  it("takes back the removal as soon as a new password is typed", () => {
    const cleared = withClearedPassword(fields);
    expect(withPassword(cleared, "hunter2").passwordCleared).toBe(false);
  });

  it("keeps the removal while the field is empty", () => {
    const cleared = withClearedPassword(fields);
    expect(withPassword(cleared, "").passwordCleared).toBe(true);
  });

  it("offers to forget a saved password nobody is replacing", () => {
    expect(offersToForgetPassword(fields, saved)).toBe(true);
  });

  it("stops offering once the password is being replaced or already removed", () => {
    expect(offersToForgetPassword(withPassword(fields, "new"), saved)).toBe(false);
    expect(offersToForgetPassword(withClearedPassword(fields), saved)).toBe(false);
  });

  it("offers nothing when no password was ever saved", () => {
    expect(offersToForgetPassword(fields, { ...saved, hasPassword: false })).toBe(false);
  });
});
