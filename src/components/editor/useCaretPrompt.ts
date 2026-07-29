"use client";

import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { caretContextOf, caretLanding } from "./caret-context";
import { requestCaretBlocks } from "./caret-request";
import { CARET_PROMPT_EVENT } from "./shortcuts";
import type { AiReview } from "./useAiReview";

/**
 * `Mod-K` anywhere (PLAN.md STEP U11): a prompt at the caret, an answer that
 * streams in where it was asked for, and the review the rest of the AI already
 * lands under.
 */

export interface CaretPrompt {
  /** Where the prompt is drawn, in viewport coordinates; null when closed. */
  at: { left: number; top: number } | null;
  busy: boolean;
  /** Blocks written so far while one is running. */
  written: number;
  error: string | null;
  ask(instruction: string): Promise<void>;
  close(): void;
}

export function useCaretPrompt(editor: Editor | null, review: AiReview): CaretPrompt {
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [written, setWritten] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setAt(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const open = () => {
      const { from } = editor.state.selection;
      const caret = editor.view.coordsAtPos(from);
      setError(null);
      setAt({ left: caret.left, top: caret.bottom });
    };
    dom.addEventListener(CARET_PROMPT_EVENT, open);
    return () => dom.removeEventListener(CARET_PROMPT_EVENT, open);
  }, [editor]);

  const ask = useCallback(
    async (instruction: string) => {
      if (!editor || busy || !instruction.trim()) return;
      setBusy(true);
      setWritten(0);
      setError(null);

      const body = toPlainJSON(editor.getJSON());
      const index = editor.state.selection.$from.index(0);
      const context = caretContextOf(body, index);
      const replacing = caretLanding(body, index) === "replace";

      try {
        let count = 0;
        let failure: string | null = null;
        await review.runStreamed(async () => {
          const answer = await requestCaretBlocks(context, instruction, (block) => {
            insert(editor, block, count === 0 && replacing);
            count += 1;
            setWritten(count);
          });
          failure = answer.error;
        });
        if (count > 0) close();
        else setError(failure ?? "The AI wrote nothing here.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "The AI request failed.");
      } finally {
        setBusy(false);
      }
    },
    [busy, close, editor, review],
  );

  return { at, busy, written, error, ask, close };
}

/**
 * The first block takes the place of the empty paragraph the caret sits in;
 * every block after it goes at the end of what has been written so far, which
 * is where the selection now is.
 */
function insert(editor: Editor, block: JSONContent, replacing: boolean): void {
  const { $from } = editor.state.selection;
  // A node selection sits at the document's own depth: there is no block around
  // the caret to replace, so the answer goes exactly where it points.
  if ($from.depth === 0) {
    editor.chain().insertContentAt($from.pos, block).run();
    return;
  }
  const from = $from.before(1);
  const to = $from.after(1);
  editor
    .chain()
    .insertContentAt(replacing ? { from, to } : to, block)
    .run();
}
