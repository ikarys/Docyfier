"use client";

import { useCallback, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { changedBlocks } from "@/domain/authoring/block-diff";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import type { Autosave } from "./useAutosave";

/**
 * Reviewing what an AI edit changed (STEP U4).
 *
 * Every AI apply is saved immediately, as it always was: a review held in
 * memory would lose the change on a reload. What the bar offers instead is an
 * exact undo — the document as it stood before the edit, restored byte for
 * byte, which is why the snapshot is taken before and never derived after.
 */

export interface AiReview {
  /** Blocks the last edit changed, while its bar is open; null when idle. */
  changed: number | null;
  /** Run an AI edit and open the review over the blocks it touched. */
  run(apply: () => void): void;
  /** The same for an edit that lands in instalments: one snapshot, one bar. */
  runStreamed(apply: () => Promise<void>): Promise<void>;
  accept(): void;
  reject(): void;
}

export function useAiReview(editor: Editor | null, autosave: Autosave): AiReview {
  const [changed, setChanged] = useState<number | null>(null);
  /** The document as it stood before that edit — what Reject restores. */
  const snapshot = useRef<JSONContent | null>(null);
  const { saveNow } = autosave;

  /** Close the review over everything that happened since `before`. */
  const settle = useCallback(
    (before: JSONContent) => {
      if (!editor) return;
      const marks = changedBlocks(before, toPlainJSON(editor.getJSON()));
      const touched = marks.filter((mark) => mark !== "same").length;
      saveNow();
      if (touched === 0) return;
      snapshot.current = before;
      editor.commands.setAiDiff(marks);
      setChanged(touched);
    },
    [editor, saveNow],
  );

  const run = useCallback(
    (apply: () => void) => {
      if (!editor) return;
      const before = toPlainJSON(editor.getJSON());
      apply();
      settle(before);
    },
    [editor, settle],
  );

  /**
   * A streamed edit is one edit: the snapshot is taken before the first block
   * and the bar opens after the last, so Reject undoes the whole answer rather
   * than the instalment that happened to arrive last.
   */
  const runStreamed = useCallback(
    async (apply: () => Promise<void>) => {
      if (!editor) return;
      const before = toPlainJSON(editor.getJSON());
      try {
        await apply();
      } finally {
        settle(before);
      }
    },
    [editor, settle],
  );

  const accept = useCallback(() => {
    editor?.commands.clearAiDiff();
    snapshot.current = null;
    setChanged(null);
  }, [editor]);

  const reject = useCallback(() => {
    if (!editor) return;
    const before = snapshot.current;
    if (before) editor.commands.setContent(before, { emitUpdate: false });
    editor.commands.clearAiDiff();
    snapshot.current = null;
    setChanged(null);
    saveNow();
  }, [editor, saveNow]);

  return { changed, run, runStreamed, accept, reject };
}
