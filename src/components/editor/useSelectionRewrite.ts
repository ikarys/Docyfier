"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { rewriteSelectionAction } from "@/app/ai-actions";
import { routeSurface, type Surface } from "@/domain/authoring/agents/routing";
import { selectionRequest } from "./selection-request";

/**
 * Rewriting the current selection: ask the model, then put the answer back.
 *
 * An inline fragment swap is small and locally visible, so Tiptap's undo is
 * review enough; only whole-block replacements go through the document's diff
 * bar, which is what `review` runs them under.
 */
export function useSelectionRewrite(
  editor: Editor,
  review: (apply: () => void) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which assistants are working, while they work. */
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const rewrite = async (instruction: string, surface: Surface) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    // Every surface says who it is before the request leaves: nothing has to
    // be read by a model first any more.
    setReason(routeSurface(surface).reason);

    const { input, range } = selectionRequest(editor.state, instruction, surface);

    // `busy` gates the button, so it has to fall back whatever happens: a
    // request that never returns would otherwise leave the menu spinning with
    // no error and no way to retry short of reloading the page.
    try {
      const res = await rewriteSelectionAction(input);
      if (!res.ok) {
        setError(res.error);
      } else if (res.mode === "text") {
        editor.chain().focus().insertContentAt(range, res.text).run();
      } else {
        setReason(res.reason);
        setNote(res.note);
        review(() => {
          editor.chain().focus().insertContentAt(range, res.blocks).run();
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "The AI request failed.");
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, reason, note, rewrite };
}
