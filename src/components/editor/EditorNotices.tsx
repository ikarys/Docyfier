"use client";

import { AiDiffBar } from "../AiDiffBar";
import type { AiReview } from "./useAiReview";
import type { Generation } from "./useStreamedGeneration";

/**
 * What the editor says at the bottom of the page: the review of the last AI
 * edit, and the reason a generation stopped. Both are transient, both belong to
 * hooks the shell already holds, and neither is part of the document.
 */
export function EditorNotices({
  review,
  generation,
}: {
  review: AiReview;
  generation: Generation;
}) {
  return (
    <>
      {review.changed !== null && (
        <AiDiffBar
          count={review.changed}
          onAccept={review.accept}
          onReject={review.reject}
        />
      )}
      {generation.error && (
        <div className="gen-error-bar no-print" role="alert">
          <span className="ai-diff-bar-label">{generation.error}</span>
          <button className="btn" onClick={generation.dismissError}>
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
