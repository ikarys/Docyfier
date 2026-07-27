import type { DocumentNode } from "@/domain/documents/body";

/**
 * A local copy of unsaved edits, keyed by document.
 *
 * Reloading the tab kills any in-flight save, so this synchronous copy is what
 * makes a refresh during the autosave debounce non-destructive. `base` is the
 * server `updatedAt` the draft was typed on top of: once the server has moved
 * past it, the write landed and the draft would undo whatever came after.
 *
 * The storage is a parameter rather than `window.localStorage`, so the rules
 * here are provable without a browser.
 */

export interface Draft {
  base: string;
  content: DocumentNode;
}

/** The slice of `Storage` this module uses — nothing wider is needed. */
export interface DraftStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const PREFIX = "docyfier:draft:";

const keyFor = (id: string) => PREFIX + id;

export function readDraft(storage: DraftStorage, id: string): Draft | null {
  try {
    const raw = storage.getItem(keyFor(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(
  storage: DraftStorage,
  id: string,
  base: string,
  content: DocumentNode,
): void {
  try {
    storage.setItem(keyFor(id), JSON.stringify({ base, content } satisfies Draft));
  } catch {
    // Quota or private mode: the server save is still the real path.
  }
}

export function clearDraft(storage: DraftStorage, id: string): void {
  try {
    storage.removeItem(keyFor(id));
  } catch {
    // Nothing to do: a draft that cannot be removed is also one nobody typed.
  }
}

/** Whether restoring this draft would recover work rather than undo it. */
export function usableDraft(draft: Draft | null, serverVersion: string): boolean {
  return draft !== null && draft.base === serverVersion;
}
