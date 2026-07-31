"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { BlockAction } from "@/domain/authoring/block-actions/contract";
import { insertStreamedPassage } from "./insert-streamed-passage";
import type { AiReview } from "./useAiReview";

/**
 * An AI action on one block (PLAN.md STEP U11): the block goes out, its
 * replacement streams back, and exactly the range it occupied is replaced — so
 * every other block of the document is left byte-identical.
 *
 * It is the passage surface underneath, given a passage of one block: same
 * route, same validation, same formatting pass, same charter check.
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
        await review.runStreamed(async () => {
          const answer = await insertStreamedPassage(
            editor,
            {
              blocks: [node.toJSON()],
              instruction: action.instruction,
              // The catalog already says which assistant this action belongs
              // to: "turn into" is layout, the rest is writing.
              surface: { kind: "block-action", family: action.family },
            },
            { from: at.pos, to: at.pos + at.size },
          );
          if (answer.error) setError(answer.error);
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "The AI request failed.");
      } finally {
        setRunning(null);
      }
    },
    [editor, review, running],
  );

  const dismissError = () => setError(null);

  return { running, error, dismissError, run };
}
