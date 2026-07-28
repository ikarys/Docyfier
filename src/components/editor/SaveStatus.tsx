"use client";

import type { SaveState } from "./save-state";

const LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Save failed",
};

/**
 * What autosave has to say. Saving is automatic, so this reports rather than
 * asks — except on failure, the one moment a manual write is worth offering.
 */
export function SaveStatus({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  if (state === "error") {
    return (
      <button className="save-status save-retry" data-state={state} onClick={onRetry}>
        Save failed — retry
      </button>
    );
  }

  return (
    <span className="save-status" data-state={state} role="status">
      {LABEL[state]}
    </span>
  );
}
