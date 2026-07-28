"use client";

import { importDocumentsAction } from "@/app/settings/storage/actions";
import { useAttempt } from "./useAttempt";

/** Move what is still on disk into the database now in use. */
export function FilesImportSection() {
  const { attempt, run } = useAttempt<{ imported: number; skipped: number }>();

  return (
    <div className="field">
      <span className="field-label">Import from files</span>
      <div className="field-row">
        <button
          type="button"
          className="btn"
          disabled={attempt.state === "running"}
          onClick={() => void run(importDocumentsAction)}
        >
          {attempt.state === "running" ? (
            <>
              <span className="spinner" aria-hidden /> Importing…
            </>
          ) : (
            "Import documents from files"
          )}
        </button>
      </div>
      <span className="field-help">
        Copies the documents still stored on disk into the database. Documents
        already there are skipped, and the files are never deleted.
      </span>
      {attempt.state === "done" && (
        <span className="field-help field-ok">
          ✓ {attempt.result.imported} imported, {attempt.result.skipped} already
          present
        </span>
      )}
      {attempt.state === "failed" && (
        <span className="field-help field-error">✕ {attempt.message}</span>
      )}
    </div>
  );
}
