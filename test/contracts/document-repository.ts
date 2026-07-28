import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { DocumentRecord } from "@/domain/documents/document";
import type { DocumentRepository } from "@/domain/documents/repository";

/**
 * The `DocumentRepository` contract, as one suite every adapter runs.
 *
 * The port promises that a document put in comes back out unchanged and
 * detached, that ids are unique, and that a list is ordered by recency. Those
 * promises are what the use cases are written against, so they have to hold for
 * files, PostgreSQL, MySQL and the in-memory fake alike — otherwise "swap the
 * backend in Settings" is a lie the type system cannot catch.
 */

export interface RepositoryHarness {
  repository: DocumentRepository;
  /** Release whatever the adapter allocated (a directory, a pool). */
  dispose?(): Promise<void>;
}

const record = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  id: "doc-1",
  title: "Rapport",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Bonjour" }] }],
  },
  theme: { preset: "editorial" },
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  ...overrides,
});

export function describeDocumentRepository(
  name: string,
  open: () => Promise<RepositoryHarness>,
): void {
  describe(`${name} (DocumentRepository contract)`, () => {
    let harness: RepositoryHarness;
    let repository: DocumentRepository;
    const opened: RepositoryHarness[] = [];

    beforeEach(async () => {
      harness = await open();
      opened.push(harness);
      repository = harness.repository;
    });

    afterAll(async () => {
      for (const used of opened) await used.dispose?.();
    });

    it("starts empty", async () => {
      expect(await repository.list()).toEqual([]);
    });

    it("returns null for an id it does not hold", async () => {
      expect(await repository.get("missing")).toBeNull();
    });

    it("gives back exactly what was put in", async () => {
      const stored = record();
      await repository.put(stored);
      expect(await repository.get(stored.id)).toEqual(stored);
    });

    it("round-trips the optional rename", async () => {
      const renamed = record({ titleOverride: "Nom choisi" });
      await repository.put(renamed);
      expect((await repository.get(renamed.id))?.titleOverride).toBe("Nom choisi");
    });

    it("round-trips a body with nested blocks and attributes", async () => {
      const rich = record({
        content: {
          type: "doc",
          content: [
            { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "T" }] },
            {
              type: "callout",
              attrs: { variant: "warn" },
              content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }],
            },
          ],
        },
      });
      await repository.put(rich);
      expect((await repository.get(rich.id))?.content).toEqual(rich.content);
    });

    it("round-trips a theme with overrides", async () => {
      const themed = record({
        theme: { preset: "vivid", overrides: { accent: "#123456", radius: "round" } },
      });
      await repository.put(themed);
      expect((await repository.get(themed.id))?.theme).toEqual(themed.theme);
    });

    it("replaces a document rather than storing it twice", async () => {
      await repository.put(record());
      await repository.put(record({ title: "Nouveau titre" }));

      expect(await repository.list()).toHaveLength(1);
      expect((await repository.get("doc-1"))?.title).toBe("Nouveau titre");
    });

    it("lists a summary per document", async () => {
      await repository.put(record());
      expect(await repository.list()).toEqual([
        { id: "doc-1", title: "Rapport", updatedAt: "2026-01-01T10:00:00.000Z" },
      ]);
    });

    it("lists the most recently updated first", async () => {
      await repository.put(record({ id: "old", updatedAt: "2026-01-01T10:00:00.000Z" }));
      await repository.put(record({ id: "new", updatedAt: "2026-03-01T10:00:00.000Z" }));
      await repository.put(record({ id: "mid", updatedAt: "2026-02-01T10:00:00.000Z" }));

      expect((await repository.list()).map((s) => s.id)).toEqual(["new", "mid", "old"]);
    });

    it("removes a document", async () => {
      await repository.put(record());
      await repository.remove("doc-1");

      expect(await repository.get("doc-1")).toBeNull();
      expect(await repository.list()).toEqual([]);
    });

    it("treats removing an unknown id as a no-op, not a failure", async () => {
      await expect(repository.remove("missing")).resolves.toBeUndefined();
    });

    /** A caller that edits what it read must not reach into the store. */
    it("hands out detached records", async () => {
      await repository.put(record());
      const first = await repository.get("doc-1");
      first!.title = "muté";
      first!.content.content![0].type = "muté";

      const second = await repository.get("doc-1");
      expect(second?.title).toBe("Rapport");
      expect(second?.content.content?.[0].type).toBe("paragraph");
    });

    /** And a caller that keeps editing what it stored must not either. */
    it("stores detached records", async () => {
      const stored = record();
      await repository.put(stored);
      stored.title = "muté";
      stored.content.content![0].type = "muté";

      const read = await repository.get("doc-1");
      expect(read?.title).toBe("Rapport");
      expect(read?.content.content?.[0].type).toBe("paragraph");
    });

    it("keeps documents apart", async () => {
      await repository.put(record({ id: "a", title: "A" }));
      await repository.put(record({ id: "b", title: "B" }));

      expect((await repository.get("a"))?.title).toBe("A");
      expect((await repository.get("b"))?.title).toBe("B");
      expect(await repository.list()).toHaveLength(2);
    });
  });
}
