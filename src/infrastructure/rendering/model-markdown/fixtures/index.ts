import { DOCUMENT_CASES } from "./document";
import { LAYOUT_CASES } from "./layout";
import { PROSE_CASES } from "./prose";
import { MARK_CASES } from "./marks";

/**
 * One sample per node type and per mark the editor ships (PLAN.md STEP U14).
 *
 * Split the way the format contract is — prose, layout, document — because the
 * two lists have to stay the same list: a block an agent is shown is a block
 * the format must carry, and the reverse.
 */

export { MARK_CASES };
export type { RoundTripCase } from "./nodes";

export const BLOCK_CASES = [...PROSE_CASES, ...LAYOUT_CASES, ...DOCUMENT_CASES];
