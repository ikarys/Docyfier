import type { JSONContent } from "@tiptap/core";
import { writeAtCaretAction } from "@/app/ai-actions";
import type { CaretContext } from "@/lib/ai/service";
import { ndjsonLines } from "./generation-handover";

/**
 * The editor's side of the caret surface (PLAN.md STEP U11): streamed when the
 * route can open it, one blocking call otherwise.
 *
 * Blocks are handed over as they arrive rather than collected: unlike a
 * whole-document transform, they are all inserted at one point, so showing them
 * appear costs nothing and the review still closes over the whole answer.
 */

export interface CaretAnswer {
  /** Null when nothing was written at all; the caller says why. */
  error: string | null;
}

export async function requestCaretBlocks(
  context: CaretContext,
  instruction: string,
  onBlock: (block: JSONContent) => void,
): Promise<CaretAnswer> {
  const res = await fetch("/api/caret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...context, instruction }),
  });

  if (res.ok && res.body) {
    let failure: string | null = null;
    for await (const entry of ndjsonLines(res.body)) {
      if (entry.block) onBlock(entry.block as JSONContent);
      else if (typeof entry.error === "string") failure = entry.error;
    }
    return { error: failure };
  }

  const blocking = await writeAtCaretAction(context, instruction);
  if (!blocking.ok) return { error: blocking.error };
  blocking.blocks.forEach(onBlock);
  return { error: null };
}
