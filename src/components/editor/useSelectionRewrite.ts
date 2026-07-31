"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { rewriteSelectionAction } from "@/app/ai-actions";
import { routeSurface, type Surface } from "@/domain/authoring/agents/routing";
import { insertStreamedPassage } from "./insert-streamed-passage";
import { selectionRequest } from "./selection-request";
import type { AiReview } from "./useAiReview";

/**
 * Rewriting the current selection: ask the model, then put the answer back.
 *
 * An inline fragment swap is small and locally visible, so Tiptap's undo is
 * review enough; whole-block replacements stream in block by block and land
 * under the document's diff bar as one edit, so Reject undoes the whole answer
 * rather than the instalment that happened to arrive last.
 */
export function useSelectionRewrite(editor: Editor, review: AiReview) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Which assistant is working, while it works. */
  const [reason, setReason] = useState<string | null>(null);

  const rewrite = async (instruction: string, surface: Surface) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    // Every surface says who it is before the request leaves: nothing has to be
    // read by a model first any more.
    setReason(routeSurface(surface).reason);

    const { input, range } = selectionRequest(editor.state, instruction, surface);

    // `busy` gates the button, so it has to fall back whatever happens: a
    // request that never returns would otherwise leave the menu spinning with
    // no error and no way to retry short of reloading the page.
    try {
      if (input.mode === "text") {
        const res = await rewriteSelectionAction(input);
        if (!res.ok) setError(res.error);
        else if (res.mode === "text") {
          editor.chain().focus().insertContentAt(range, res.text).run();
        }
        return;
      }

      await review.runStreamed(async () => {
        const answer = await insertStreamedPassage(editor, input, range);
        if (answer.reason) setReason(answer.reason);
        if (answer.error) setError(answer.error);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The AI request failed.");
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, reason, rewrite };
}
