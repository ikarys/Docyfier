import { beforeEach, describe, expect, it } from "vitest";
import { testDeps, type TestDeps } from "@test/fakes/document-deps";
import type { DocumentRecord } from "@/domain/documents/document";
import { InMemoryDocumentRepository } from "@/infrastructure/documents/in-memory-repository";
import { importDocuments } from "./import-documents";

/**
 * A stored document. The title is derived from the body, never independent of
 * it — a record whose two disagree is one no writer can produce.
 */
const record = (id: string, overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id,
  title: `Document ${id}`,
  content: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: `Document ${id}` }],
      },
    ],
  },
  theme: { preset: "editorial" },
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  ...overrides,
});

let deps: TestDeps;
beforeEach(() => {
  deps = testDeps();
});

/**
 * Switching to a database must not hide existing work, and must stay safe to
 * re-run: the source is never touched and what is already there is left alone.
 */
describe("importDocuments", () => {
  it("copies every document the source holds", async () => {
    const source = new InMemoryDocumentRepository([record("a"), record("b")]);

    expect(await importDocuments(deps, source)).toEqual({ imported: 2, skipped: 0 });
    expect(deps.repository.size).toBe(2);
  });

  it("keeps the ids, so a link to a document still resolves", async () => {
    const source = new InMemoryDocumentRepository([record("a")]);

    await importDocuments(deps, source);

    expect((await deps.repository.get("a"))?.title).toBe("Document a");
  });

  it("skips what the destination already holds rather than overwriting it", async () => {
    await deps.repository.put(record("a", { titleOverride: "Version en base" }));
    const source = new InMemoryDocumentRepository([record("a"), record("b")]);

    expect(await importDocuments(deps, source)).toEqual({ imported: 1, skipped: 1 });
    expect((await deps.repository.get("a"))?.titleOverride).toBe("Version en base");
  });

  it("is safe to run twice", async () => {
    const source = new InMemoryDocumentRepository([record("a")]);

    await importDocuments(deps, source);
    expect(await importDocuments(deps, source)).toEqual({ imported: 0, skipped: 1 });
  });

  it("never touches the source", async () => {
    const source = new InMemoryDocumentRepository([record("a")]);

    await importDocuments(deps, source);

    expect(source.size).toBe(1);
    expect((await source.get("a"))?.title).toBe("Document a");
  });

  it("does nothing when the source is already the destination", async () => {
    await deps.repository.put(record("a"));

    expect(await importDocuments(deps, deps.repository)).toEqual({
      imported: 0,
      skipped: 0,
    });
  });

  /** A database must never receive a shape its readers would have to repair. */
  it("repairs a legacy record on the way in", async () => {
    const legacy = record("a", { theme: "minimal" as never });
    const source = new InMemoryDocumentRepository([legacy]);

    await importDocuments(deps, source);

    expect((await deps.repository.get("a"))?.theme).toEqual({ preset: "minimal" });
  });
});
