import { beforeEach, describe, expect, it } from "vitest";
import {
  InvalidConnection,
  StorageConnection,
  type StorageConnectionRecord,
} from "@/domain/configuration/storage-connection";
import type {
  StorageConnectionRepository,
  StorageProbe,
} from "@/domain/configuration/storage-repository";
import {
  probeConnection,
  saveConnection,
  storageConnection,
  storagePassword,
  storageSummary,
} from "./manage-storage";

const database = {
  driver: "postgres" as const,
  host: "db.example.com",
  port: 5432,
  user: "docyfier",
  password: "hunter2",
  database: "docs",
  ssl: false,
};

class InMemoryConnections implements StorageConnectionRepository {
  constructor(
    private connection = StorageConnection.create({ driver: "files" as const }),
  ) {}

  async load(): Promise<StorageConnection> {
    return this.connection;
  }

  async save(connection: StorageConnection): Promise<void> {
    this.connection = connection;
  }
}

class CountingProbe implements StorageProbe {
  readonly seen: StorageConnectionRecord[] = [];
  constructor(private readonly answer: number | Error = 3) {}

  async countDocuments(connection: StorageConnection): Promise<number> {
    this.seen.push(connection.toRecord());
    if (this.answer instanceof Error) throw this.answer;
    return this.answer;
  }
}

let deps: { connections: InMemoryConnections; probe: CountingProbe };
beforeEach(() => {
  deps = { connections: new InMemoryConnections(), probe: new CountingProbe() };
});

describe("saveConnection", () => {
  it("proves a database answers before trusting it", async () => {
    await saveConnection(deps, { ...database, password: "hunter2" });

    expect(deps.probe.seen).toHaveLength(1);
    expect((await storageConnection(deps)).host).toBe("db.example.com");
  });

  it("keeps the stored password when the form leaves the field untouched", async () => {
    await saveConnection(deps, database);
    await saveConnection(deps, { ...database, password: undefined });

    expect(await storagePassword(deps)).toBe("hunter2");
  });

  it("clears the password when the user explicitly empties the field", async () => {
    await saveConnection(deps, database);
    await saveConnection(deps, { ...database, password: "" });

    expect(await storagePassword(deps)).toBe("");
  });

  it("saves nothing when the store cannot be reached", async () => {
    const failing = {
      connections: deps.connections,
      probe: new CountingProbe(new Error("ECONNREFUSED")),
    };

    await expect(saveConnection(failing, database)).rejects.toThrow("ECONNREFUSED");
    expect((await storageConnection(failing)).driver).toBe("files");
  });

  it("does not probe the file store: there is nothing to connect to", async () => {
    await saveConnection(deps, { driver: "files" });

    expect(deps.probe.seen).toHaveLength(0);
    expect((await storageConnection(deps)).driver).toBe("files");
  });

  it("refuses input the domain calls invalid, and stores nothing", async () => {
    await expect(saveConnection(deps, { ...database, host: "" })).rejects.toThrow(
      InvalidConnection,
    );
    expect((await storageConnection(deps)).driver).toBe("files");
  });
});

describe("probeConnection", () => {
  it("tests what the user typed, under the password already stored", async () => {
    await saveConnection(deps, database);

    const count = await probeConnection(deps, { ...database, password: undefined });

    expect(count).toBe(3);
    expect(deps.probe.seen.at(-1)?.password).toBe("hunter2");
  });
});

describe("storageSummary", () => {
  it("never carries the password", async () => {
    await saveConnection(deps, database);

    const summary = await storageSummary(deps);
    expect(summary).not.toHaveProperty("password");
    expect(summary.hasPassword).toBe(true);
  });
});
