"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { saveDocumentAction } from "@/app/actions";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { clearDraft, readDraft, usableDraft, writeDraft } from "@/lib/editor/draft";
import type { SaveState } from "./save-state";

/**
 * Keeping the document written down.
 *
 * Three things have to hold, and each one is a line below: typing is written
 * after a pause rather than per keystroke, nothing is dropped when a save fails
 * or a tab closes mid-flight, and edits that never reached the server come back
 * after a reload.
 */

const DEBOUNCE_MS = 700;

export interface Autosave {
  saveState: SaveState;
  /** Queue the editor's content, to be written after a pause. */
  scheduleSave(editor: Editor): void;
  /** Write the current content immediately, bypassing the debounce. */
  saveNow(): void;
  /** Suspend autosave while blocks stream in: one write at the end instead. */
  setStreaming(streaming: boolean): void;
}

export function useAutosave(
  id: string,
  editor: Editor | null,
  initialUpdatedAt: string,
): Autosave {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  /** Latest editor JSON not yet known to be on the server; null when in sync. */
  const pending = useRef<JSONContent | null>(null);
  /** Server `updatedAt` of the last write we know landed. */
  const baseVersion = useRef(initialUpdatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streaming = useRef(false);

  const storage = () => (typeof window === "undefined" ? null : window.localStorage);

  const flushSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const content = pending.current;
    if (content === null) return;
    setSaveState("saving");
    // `pending` is cleared only once the server confirms, so a failed or
    // interrupted save leaves the content queued instead of dropping it.
    void saveDocumentAction(id, content)
      .then((res) => {
        if (!res) {
          setSaveState("error");
          return;
        }
        baseVersion.current = res.updatedAt;
        setSaveState("saved");
        if (pending.current === content) {
          pending.current = null;
          const store = storage();
          if (store) clearDraft(store, id);
        }
      })
      .catch(() => setSaveState("error"));
  }, [id]);

  const queue = useCallback(
    (content: JSONContent) => {
      pending.current = content;
      const store = storage();
      if (store) writeDraft(store, id, baseVersion.current, content);
    },
    [id],
  );

  const scheduleSave = useCallback(
    (editor: Editor) => {
      if (streaming.current) return;
      setSaveState("saving");
      queue(toPlainJSON(editor.getJSON()));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flushSave(), DEBOUNCE_MS);
    },
    [flushSave, queue],
  );

  const saveNow = useCallback(() => {
    if (!editor) return;
    queue(toPlainJSON(editor.getJSON()));
    flushSave();
  }, [editor, queue, flushSave]);

  // Flush on unmount (in-app navigation), on tab hide, and on pagehide — a
  // reload or tab close fires `pagehide` but neither `visibilitychange` on all
  // browsers nor React cleanup, and it kills the in-flight request either way.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flushSave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flushSave);
      flushSave();
    };
  }, [flushSave]);

  // Recover edits that never reached the server (reload mid-debounce, offline,
  // crashed tab). Anything typed against an older version is a landed save.
  const restored = useRef(false);
  useEffect(() => {
    if (!editor || restored.current) return;
    restored.current = true;
    const store = storage();
    if (!store) return;
    const draft = readDraft(store, id);
    if (!draft) return;
    if (!usableDraft(draft, baseVersion.current)) {
      clearDraft(store, id);
      return;
    }
    editor.commands.setContent(draft.content, { emitUpdate: false });
    pending.current = draft.content;
    flushSave();
  }, [editor, id, flushSave]);

  // `Mod-S` is what a writer presses when they want to be sure. Saving is
  // already automatic, so this only skips the pause — and it answers wherever
  // the caret is, which a keymap inside the editor could not.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "s") return;
      event.preventDefault();
      saveNow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveNow]);

  const setStreaming = useCallback((value: boolean) => {
    streaming.current = value;
  }, []);

  return { saveState, scheduleSave, saveNow, setStreaming };
}
