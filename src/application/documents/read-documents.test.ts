import { beforeEach, describe, expect, it } from "vitest";
import { testDeps, type TestDeps } from "@test/fakes/document-deps";
import { emptyBody } from "@/domain/documents/body";
import { getDocument, listDocuments } from "./read-documents";
import { createDocument, saveDocument } from "./write-documents";

let deps: TestDeps;
beforeEach(() => {
  deps = testDeps();
});

describe("listDocuments", () => {
  it("is empty until something is created", async () => {
    expect(await listDocuments(deps)).toEqual([]);
  });

  it("lists the most recently updated first", async () => {
    const first = await createDocument(deps);
    await createDocument(deps);
    deps.clock.set("2026-06-01T12:00:00.000Z");
    await saveDocument(deps, first.id, emptyBody());

    expect((await listDocuments(deps)).map((s) => s.id)).toEqual(["doc-1", "doc-2"]);
  });
});

describe("getDocument", () => {
  it("returns null for an id that was never stored", async () => {
    expect(await getDocument(deps, "missing")).toBeNull();
  });

  it("returns the document that was stored", async () => {
    const { id } = await createDocument(deps);
    expect((await getDocument(deps, id))?.id).toBe(id);
  });

  /** The repair belongs here, not at a render site. */
  it("repairs a record written before the theme tokens existed", async () => {
    await deps.repository.put({
      id: "legacy",
      title: "Ancien",
      content: emptyBody(),
      theme: "minimal" as never,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });

    expect((await getDocument(deps, "legacy"))?.theme).toEqual({ preset: "minimal" });
  });

  it("repairs a record whose body a driver could not return", async () => {
    await deps.repository.put({
      id: "broken",
      title: "Cassé",
      content: null as never,
      theme: { preset: "editorial" },
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-01-01T10:00:00.000Z",
    });

    expect((await getDocument(deps, "broken"))?.body).toEqual(emptyBody());
  });
});
