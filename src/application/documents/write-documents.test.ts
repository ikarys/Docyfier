import { beforeEach, describe, expect, it } from "vitest";
import { testDeps, type TestDeps } from "@test/fakes/document-deps";
import { getDocument } from "./read-documents";
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  renameDocument,
  saveDocument,
  setDocumentTheme,
} from "./write-documents";

const text = (value: string) => ({ type: "text", text: value });
const heading = (value: string) => ({
  type: "heading",
  attrs: { level: 1 },
  content: [text(value)],
});
const doc = (...content: object[]) => ({ type: "doc", content });

const LATER = "2026-06-01T12:00:00.000Z";

let deps: TestDeps;
beforeEach(() => {
  deps = testDeps();
});

/**
 * The commands, against a real repository implementation. What each one decides
 * belongs to the entity and is tested there; what is checked here is that the
 * decision is actually persisted, and that a command on a document that is gone
 * says so instead of failing.
 */
describe("createDocument", () => {
  it("persists the new document under a generated id", async () => {
    const document = await createDocument(deps);

    expect(document.id).toBe("doc-1");
    expect(await deps.repository.get("doc-1")).not.toBeNull();
  });

  it("starts from the content it is given", async () => {
    const document = await createDocument(deps, { body: doc(heading("Rapport")) });
    expect(document.title).toBe("Rapport");
  });

  it("gives every document its own id", async () => {
    await createDocument(deps);
    await createDocument(deps);
    expect(deps.repository.size).toBe(2);
  });
});

describe("saveDocument", () => {
  it("persists the new content and moves the update time", async () => {
    const { id } = await createDocument(deps);
    deps.clock.set(LATER);

    const saved = await saveDocument(deps, id, doc(heading("Titre")));

    expect(saved?.title).toBe("Titre");
    expect(saved?.updatedAt).toBe(LATER);
    expect((await getDocument(deps, id))?.title).toBe("Titre");
  });

  it("returns null for a document that is no longer there", async () => {
    expect(await saveDocument(deps, "missing", doc())).toBeNull();
  });

  it("does not create the document it cannot find", async () => {
    await saveDocument(deps, "missing", doc());
    expect(deps.repository.size).toBe(0);
  });
});

describe("renameDocument", () => {
  it("persists the rename", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });

    await renameDocument(deps, id, "Nom choisi");

    expect((await getDocument(deps, id))?.title).toBe("Nom choisi");
  });

  it("keeps the rename in force when the content changes afterwards", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });
    await renameDocument(deps, id, "Nom choisi");

    await saveDocument(deps, id, doc(heading("Autre titre")));

    expect((await getDocument(deps, id))?.title).toBe("Nom choisi");
  });

  it("hands the title back to the content when cleared", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });
    await renameDocument(deps, id, "Nom choisi");

    await renameDocument(deps, id, "");

    expect((await getDocument(deps, id))?.title).toBe("Rapport");
  });

  it("returns null for an unknown id", async () => {
    expect(await renameDocument(deps, "missing", "x")).toBeNull();
  });
});

describe("setDocumentTheme", () => {
  it("persists the theme and leaves the content alone", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });

    await setDocumentTheme(deps, id, { preset: "vivid" });

    const reloaded = await getDocument(deps, id);
    expect(reloaded?.theme).toEqual({ preset: "vivid" });
    expect(reloaded?.title).toBe("Rapport");
  });

  it("returns null for an unknown id", async () => {
    expect(await setDocumentTheme(deps, "missing", { preset: "vivid" })).toBeNull();
  });
});

describe("duplicateDocument", () => {
  it("stores a second document under a new id", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });

    const copy = await duplicateDocument(deps, id);

    expect(copy?.id).toBe("doc-2");
    expect(copy?.title).toBe("Copy of Rapport");
    expect(deps.repository.size).toBe(2);
  });

  it("leaves the source untouched", async () => {
    const { id } = await createDocument(deps, { body: doc(heading("Rapport")) });

    await duplicateDocument(deps, id);

    expect((await getDocument(deps, id))?.title).toBe("Rapport");
  });

  it("returns null for an unknown id, and stores nothing", async () => {
    expect(await duplicateDocument(deps, "missing")).toBeNull();
    expect(deps.repository.size).toBe(0);
  });
});

describe("deleteDocument", () => {
  it("removes the document", async () => {
    const { id } = await createDocument(deps);

    await deleteDocument(deps, id);

    expect(await getDocument(deps, id)).toBeNull();
  });

  it("says nothing about an id that was already gone", async () => {
    await expect(deleteDocument(deps, "missing")).resolves.toBeUndefined();
  });
});
