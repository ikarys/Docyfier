import "server-only";
import { restructureDocument } from "@/application/authoring/restructure-document";
import type { AuthoringDeps } from "@/application/authoring/deps";
import type { DocumentNode } from "@/domain/documents/body";
import { providerMessage } from "./ndjson";
import { callTimeoutMs } from "./provider";
import { withHeartbeat } from "./stream-heartbeat";

/**
 * The planned whole-document edit, as the same NDJSON the single-call path
 * emits: one `{"op":…}` per span, then `{"done":…}` or `{"error":…}`.
 *
 * The editor's side is untouched by the split. It already collects operations
 * and applies them once, against the indexes of the document as it was — so
 * spans that finish out of order are not a problem to solve here, they are a
 * problem that never existed.
 */

/** How long a silence may last before a beat goes out to hold the connection. */
const BEAT_MS = 5_000;

const STALLED =
  "The AI server went quiet before it finished the edit. It may be overloaded — try again, or ask for a smaller change.";

export async function* plannedOpLines(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  instruction: string,
): AsyncGenerator<Record<string, unknown>> {
  // The plan is one call over the whole document and the longest silence of the
  // three: without a beat behind it, a proxy closes the connection before the
  // first span is even decided.
  const events = withHeartbeat(restructureDocument(deps, blocks, instruction), {
    every: BEAT_MS,
    idleLimit: callTimeoutMs(),
  });
  let ops = 0;

  try {
    for await (const event of events) {
      if (event.kind === "beat") {
        yield { beat: true };
      } else if (event.kind === "stalled") {
        yield { error: STALLED, ops };
        return;
      } else {
        ops++;
        yield { op: event.part };
      }
    }
  } catch (err) {
    // Only the plan can fail this far: a span that goes wrong is dropped where
    // it is decided, and the spans that worked are already on their way out.
    yield { error: providerMessage(err), ops };
    return;
  }

  yield { done: true, ops, skipped: 0 };
}
