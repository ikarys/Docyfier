import { describe, expect, it } from "vitest";
import {
  DEFAULT_PORTS,
  STORAGE_DRIVERS,
  isStorageDriver,
  toStorageSummary,
  toSummary,
  type AiProvider,
  type StorageSettings,
} from "./settings-types";

const provider: AiProvider = {
  id: "p1",
  label: "LM Studio",
  baseUrl: "http://localhost:1234/v1",
  model: "qwen",
  apiKey: "sk-live-123",
  maxOutputTokens: 4096,
  structuredOutput: true,
};

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
 */
describe("toSummary", () => {
  it("never carries the API key", () => {
    const summary = toSummary(provider);
    expect(summary).not.toHaveProperty("apiKey");
    expect(JSON.stringify(summary)).not.toContain("sk-live-123");
  });

  it("reports only whether a key is stored", () => {
    expect(toSummary(provider).hasApiKey).toBe(true);
    expect(toSummary({ ...provider, apiKey: "" }).hasApiKey).toBe(false);
  });

  it("keeps everything the switcher and the settings list render", () => {
    expect(toSummary(provider)).toEqual({
      id: "p1",
      label: "LM Studio",
      baseUrl: "http://localhost:1234/v1",
      model: "qwen",
      maxOutputTokens: 4096,
      structuredOutput: true,
      hasApiKey: true,
    });
  });
});

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
