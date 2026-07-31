import type { JSONContent } from "@tiptap/core";
import { rewriteSelectionAction } from "@/app/ai-actions";
import type { Surface } from "@/domain/authoring/agents/routing";
import { ndjsonLines } from "./generation-handover";

/**
 * The editor's side of the passage surface: streamed when the route can open
 * it, one blocking call otherwise — the same handover the caret surface uses.
 *
 * The blocking path is not a duplicate of the streamed one, it is its fallback:
 * a provider whose stream will not open answers before a single byte has
 * reached the document, so nothing has to be undone to fall back.
 */

export interface PassageAnswer {
  /** Null when the answer landed whole. */
  error: string | null;
  /** Which assistant worked, once the route has said so. */
  reason: string | null;
}

export interface PassageRequest {
  blocks: JSONContent[];
  instruction: string;
  surface: Surface;
}

export async function requestPassageBlocks(
  request: PassageRequest,
  onBlock: (block: JSONContent) => void,
): Promise<PassageAnswer> {
  const res = await fetch("/api/passage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });

  if (res.ok && res.body) {
    let failure: string | null = null;
    let reason: string | null = null;
    for await (const entry of ndjsonLines(res.body)) {
      if (entry.block) onBlock(entry.block as JSONContent);
      else if (typeof entry.reason === "string") reason = entry.reason;
      else if (typeof entry.error === "string") failure = entry.error;
    }
    return { error: failure, reason };
  }

  const blocking = await rewriteSelectionAction({ mode: "blocks", ...request });
  if (!blocking.ok) return { error: blocking.error, reason: null };
  if (blocking.mode !== "blocks") return { error: "The AI answered the wrong shape.", reason: null };
  blocking.blocks.forEach(onBlock);
  return { error: null, reason: blocking.reason };
}
