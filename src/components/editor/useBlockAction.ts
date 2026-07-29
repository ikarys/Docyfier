"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { rewriteSelectionAction } from "@/app/ai-actions";
import type { BlockAction } from "@/domain/authoring/block-actions/contract";
import type { AiReview } from "./useAiReview";

/**
 * An AI action on one block (PLAN.md STEP U11): the block goes out, its
 * replacement comes back, and exactly the range it occupied is replaced — so
 * every other block of the document is left byte-identical.
 *
 * It is the selection surface underneath, given a selection of one block: same
 * use case, same validation, same formatting pass.
 */
export interface BlockActionRunner {
  /** The action running, by id; null when idle. */
  running: string | null;
  error: string | null;
  dismissError(): void;
  run(action: BlockAction, at: { pos: number; size: number }): Promise<void>;
}

export function useBlockAction(editor: Editor, review: AiReview): BlockActionRunner {
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: BlockAction, at: { pos: number; size: number }) => {
      if (running) return;
      const node = editor.state.doc.nodeAt(at.pos);
      if (!node) return;
      setRunning(action.id);
      setError(null);

      try {
        const answer = await rewriteSelectionAction({
          mode: "blocks",
          blocks: [node.toJSON()],
          instruction: action.instruction,
        });
        if (!answer.ok) {
          setError(answer.error);
          return;
        }
        if (answer.mode !== "blocks" || answer.blocks.length === 0) {
          setError("The AI had nothing to put in this block's place.");
          return;
        }
        review.run(() => {
          editor
            .chain()
            .insertContentAt({ from: at.pos, to: at.pos + at.size }, answer.blocks)
            .run();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "The AI request failed.");
      } finally {
        setRunning(null);
      }
    },
    [editor, review, running],
  );

  return { running, error, dismissError: () => setError(null), run };
}
