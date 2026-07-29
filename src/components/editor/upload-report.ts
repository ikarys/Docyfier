/**
 * What an upload tells the writer while it runs and when it fails (PLAN.md
 * STEP U10). Wording only: showing it is `upload-progress.ts`, which needs a
 * document to hang a decoration on — so the sentences stay testable alone.
 */

export interface UploadFailure {
  readonly name: string;
  readonly reason: string;
}

/** Where a batch has got to. A single file has no count worth reading. */
export function uploadProgressNote(done: number, total: number): string {
  return total > 1 ? `Uploading… ${done + 1}/${total}` : "Uploading…";
}

/** Why a file did not make it — "upload failed" on its own helps nobody. */
export function uploadFailureNote(failures: readonly UploadFailure[]): string | null {
  if (failures.length === 0) return null;
  return failures.map(({ name, reason }) => `${name} — ${reason}`).join(" · ");
}
