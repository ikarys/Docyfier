import { LAYOUT_BLOCK_NAME_LIST } from "./prompts/blocks/layout";

/**
 * What a whole-document layout pass decided, before any of it is produced
 * (PLAN.md STEP U14).
 *
 * Asked to restructure a document in one call, a reasoning model spends most of
 * its output deliberating: it has to decide what deserves a richer block *and*
 * build it, over sixty blocks at once. Measured at 84% of the answer, which is
 * the wait the user counts.
 *
 * So the deciding is its own call, over an outline rather than the document,
 * and it answers with intentions — spans of blocks and what each should become.
 * Producing them is then one small, fully determined call per intention, and
 * those run at the same time. It is STEP U7's rule applied to an existing
 * document: plan first, write second.
 */

/** A span of the document, and the block it should become. */
export interface LayoutIntent {
  readonly from: number;
  /** The last block of the span; the same as `from` for a single block. */
  readonly through: number;
  /** A layout block name — never a type the editor cannot draw. */
  readonly as: string;
}

const NAMES: readonly string[] = LAYOUT_BLOCK_NAME_LIST;

function intentOf(raw: unknown, at: number, blockCount: number): LayoutIntent {
  if (typeof raw !== "object" || raw === null) throw new Error(`Intent ${at} is not an object`);
  const { from, through, as } = raw as Record<string, unknown>;
  if (typeof as !== "string" || !NAMES.includes(as)) {
    throw new Error(`Intent ${at} has an "as" the editor cannot draw: ${JSON.stringify(as)}`);
  }
  const last = through === undefined || through === null ? from : through;
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(last) ||
    (from as number) < 0 ||
    (last as number) < (from as number) ||
    (last as number) >= blockCount
  ) {
    throw new Error(
      `Intent ${at} names a span ${JSON.stringify(from)}..${JSON.stringify(last)}, outside 0..${blockCount - 1}`,
    );
  }
  return { from: from as number, through: last as number, as };
}

/**
 * Model output → the plan, or throw. Throwing feeds the same retry as every
 * other JSON answer: a span outside the document means the model was reading
 * something other than what it was given, and executing part of that is worse
 * than asking again.
 *
 * Overlaps are the exception. They are not a misreading but two ideas about the
 * same blocks, and refusing the whole plan for one would throw away every idea
 * that was fine.
 */
export function parseLayoutPlan(json: unknown, blockCount: number): LayoutIntent[] {
  if (!Array.isArray(json)) throw new Error("Expected a list of layout intents");
  const intents = json
    .map((raw, at) => intentOf(raw, at, blockCount))
    .sort((a, b) => a.from - b.from);

  const kept: LayoutIntent[] = [];
  let claimed = -1;
  for (const intent of intents) {
    if (intent.from <= claimed) continue;
    kept.push(intent);
    claimed = intent.through;
  }
  return kept;
}
