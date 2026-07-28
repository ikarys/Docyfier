import type { JSONContent } from "@tiptap/core";
import { transformDocumentAction } from "@/app/ai-actions";
import type { DocOp } from "@/domain/authoring/ops";
import type { DocumentBody } from "@/domain/documents/body";
import type { TransformOutcome } from "@/lib/ai/service";
import { ndjsonLines } from "./generation-handover";

/**
 * The editor's side of the streaming whole-document edit.
 *
 * Operations are collected rather than applied one by one: they address the
 * document as it was before the edit, and the review bar takes a single
 * snapshot — applying them in instalments would leave the user with one review
 * per operation and an undo that only reaches the last one. What streaming buys
 * here is the connection staying alive and the panel being able to count.
 */

export interface StreamedTransform {
  /** What to apply, including the operations that arrived before a failure. */
  outcome: TransformOutcome | null;
  error: string | null;
}

const NO_VERDICT =
  "The connection to the AI dropped before the edit was finished.";

export async function readTransformStream(
  body: ReadableStream<Uint8Array>,
  onProgress: (ops: number) => void,
): Promise<StreamedTransform> {
  const ops: DocOp[] = [];
  let doc: DocumentBody | null = null;
  let error: string | null = NO_VERDICT;

  for await (const record of ndjsonLines(body)) {
    if (record.op) {
      ops.push(record.op as DocOp);
      onProgress(ops.length);
    } else if (record.doc) {
      doc = record.doc as DocumentBody;
    } else if (typeof record.error === "string") {
      error = record.error;
    } else if (record.done) {
      error = null;
    }
  }

  const outcome: TransformOutcome | null = doc
    ? { kind: "doc", content: doc }
    : { kind: "ops", ops };
  return { outcome, error };
}

/**
 * Ask for the edit: streamed when the route can open it, in one blocking call
 * otherwise. The fallback is what answers when the route itself refuses — a
 * lost session, a body it will not read — and it is still the shorter path for
 * a small document.
 */
export async function requestTransform(
  content: JSONContent,
  instruction: string,
  onProgress: (ops: number) => void,
): Promise<StreamedTransform> {
  const res = await fetch("/api/transform", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, instruction }),
  });
  if (res.ok && res.body) return readTransformStream(res.body, onProgress);

  const blocking = await transformDocumentAction(content, instruction);
  return blocking.ok
    ? { outcome: blocking.outcome, error: null }
    : { outcome: null, error: blocking.error };
}
