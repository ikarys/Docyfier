import { describe, expect, it } from "vitest";
import { clearDraft, readDraft, usableDraft, writeDraft } from "./draft";

/** A Storage a test owns, including one that refuses to write (private mode). */
class FakeStorage {
  private entries = new Map<string, string>();
  constructor(private readonly refuse = false) {}

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.refuse) throw new Error("QuotaExceededError");
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }
}

const content = { type: "doc", content: [{ type: "paragraph" }] };
const VERSION = "2026-01-01T10:00:00.000Z";

/**
 * The local copy of unsaved edits. It exists for one case: a reload during the
 * autosave debounce kills the in-flight request, and this synchronous copy is
 * what keeps those keystrokes.
 */
describe("a draft", () => {
  it("comes back as it was written, under the version it was typed on", () => {
    const storage = new FakeStorage();
    writeDraft(storage, "doc-1", VERSION, content);

    expect(readDraft(storage, "doc-1")).toEqual({ base: VERSION, content });
  });

  it("belongs to one document", () => {
    const storage = new FakeStorage();
    writeDraft(storage, "doc-1", VERSION, content);

    expect(readDraft(storage, "doc-2")).toBeNull();
  });

  it("is dropped once it is cleared", () => {
    const storage = new FakeStorage();
    writeDraft(storage, "doc-1", VERSION, content);
    clearDraft(storage, "doc-1");

    expect(readDraft(storage, "doc-1")).toBeNull();
  });

  it("survives a storage that refuses to write: the server save is the real path", () => {
    expect(() =>
      writeDraft(new FakeStorage(true), "doc-1", VERSION, content),
    ).not.toThrow();
  });

  it("is ignored when what is stored is not a draft at all", () => {
    const storage = new FakeStorage();
    storage.setItem("docyfier:draft:doc-1", "{not json");

    expect(readDraft(storage, "doc-1")).toBeNull();
  });
});

/**
 * The rule that decides whether those keystrokes are still wanted: a draft
 * typed against a version the server has moved past is a save that landed, and
 * restoring it would undo whatever came after.
 */
describe("usableDraft", () => {
  it("keeps a draft typed on the version the server still holds", () => {
    expect(usableDraft({ base: VERSION, content }, VERSION)).toBe(true);
  });

  it("drops a draft typed on an older version", () => {
    expect(usableDraft({ base: VERSION, content }, "2026-02-01T10:00:00.000Z")).toBe(
      false,
    );
  });

  it("has nothing to say when there is no draft", () => {
    expect(usableDraft(null, VERSION)).toBe(false);
  });
});
