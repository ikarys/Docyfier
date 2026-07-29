"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { continueWritingAction } from "@/app/ai-actions";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { caretContextOf } from "./caret-context";
import { GHOST_CONTINUE_EVENT, showGhost, textBeforeCaret } from "./ghost-text";

/**
 * "Continue writing" (PLAN.md STEP U11): ask for the rest of the sentence and
 * offer it as ghost text. Nothing is written — accepting is the plugin's
 * business, and a writer who keeps typing has answered already.
 */
export function useContinuation(editor: Editor | null): { thinking: boolean } {
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    let running = false;

    const run = async () => {
      if (running) return;
      running = true;
      setThinking(true);
      const { view } = editor;
      const at = view.state.selection.from;
      const body = toPlainJSON(editor.getJSON());
      const context = {
        ...caretContextOf(body, view.state.selection.$from.index(0)),
        // The block's own text stops at the caret: what comes after it is not
        // what the writer is in the middle of saying.
        here: textBeforeCaret(view),
      };

      try {
        const answer = await continueWritingAction(context);
        // The caret is where the question was asked, or the answer is stale.
        if (answer.ok && answer.text && view.state.selection.from === at) {
          showGhost(view, { at, text: answer.text });
        }
      } finally {
        running = false;
        setThinking(false);
      }
    };

    const listener = () => void run();
    dom.addEventListener(GHOST_CONTINUE_EVENT, listener);
    return () => dom.removeEventListener(GHOST_CONTINUE_EVENT, listener);
  }, [editor]);

  return { thinking };
}
