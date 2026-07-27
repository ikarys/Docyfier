import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTS,
  STORAGE_DRIVERS,
  isStorageDriver,
  toStorageSummary,
  type StorageSettings,
} from "./settings-types";

const storage: StorageSettings = {
  driver: "postgres",
  host: "db.example.com",
  port: 5432,
  user: "docyfier",
  password: "hunter2",
  database: "docs",
  ssl: true,
};

/**
 * The summaries are the only shapes a client component may receive. A
 * credential leaking into one is a security defect, not a formatting detail.
 * The provider summary is pinned in `src/domain/configuration/ai-provider.test.ts`.
 */
describe("toStorageSummary", () => {
  it("never carries the database password", () => {
    const summary = toStorageSummary(storage);
    expect(summary).not.toHaveProperty("password");
    expect(JSON.stringify(summary)).not.toContain("hunter2");
  });

  it("reports only whether a password is stored", () => {
    expect(toStorageSummary(storage).hasPassword).toBe(true);
    expect(toStorageSummary({ ...storage, password: "" }).hasPassword).toBe(false);
  });

  it("keeps the rest of the connection", () => {
    expect(toStorageSummary(storage)).toMatchObject({
      driver: "postgres",
      host: "db.example.com",
      port: 5432,
      user: "docyfier",
      database: "docs",
      ssl: true,
    });
  });
});

describe("isStorageDriver", () => {
  it("accepts every driver the app ships", () => {
    for (const driver of STORAGE_DRIVERS) expect(isStorageDriver(driver)).toBe(true);
  });

  it("rejects anything else, including what a form may send", () => {
    expect(isStorageDriver("sqlite")).toBe(false);
    expect(isStorageDriver("")).toBe(false);
    expect(isStorageDriver(undefined)).toBe(false);
    expect(isStorageDriver(null)).toBe(false);
    expect(isStorageDriver(1)).toBe(false);
  });
});

describe("DEFAULT_PORTS", () => {
  it("declares a port for every driver", () => {
    for (const driver of STORAGE_DRIVERS) {
      expect(DEFAULT_PORTS[driver]).toBeTypeOf("number");
    }
  });

  it("uses the standard ports, so a stock database needs no port typed", () => {
    expect(DEFAULT_PORTS.postgres).toBe(5432);
    expect(DEFAULT_PORTS.mysql).toBe(3306);
  });
});
