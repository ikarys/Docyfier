"use client";

/**
 * Review bar shown after an AI edit (PLAN.md STEP U4). The changed blocks are
 * highlighted in the document; this is the global accept/reject for them.
 * Per-block accept is deliberately out of scope for v1.
 */
export function AiDiffBar({
  count,
  onAccept,
  onReject,
}: {
  count: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="ai-diff-bar no-print" role="status">
      <span className="ai-diff-bar-label">
        ✦ {count} block{count > 1 ? "s" : ""} changed by the AI
      </span>
      <button className="btn" onClick={onReject} title="Restore the document as it was">
        Reject
      </button>
      <button className="btn btn-primary" onClick={onAccept} title="Keep the changes">
        Accept all
      </button>
    </div>
  );
}
