import type { DocumentNode } from "@/domain/documents/body";

/**
 * Edit operations on the top-level blocks of a document (PLAN.md STEP U4).
 *
 * Whole-document AI transforms used to resend the document and get a whole
 * document back — expensive, and every untouched section was silently rewritten
 * by the model. The model now returns a small list of ops addressing blocks by
 * index; sections it does not name are never touched.
 *
 * Pure and shared: the server parses/validates ops, the client applies them.
 */

export type DocOp =
  /**
   * Swap blocks `index` through `through` — the same block when it reaches no
   * further — for these ones.
   *
   * A span rather than a replace followed by deletes, because consolidating is
   * what a layout pass is for: three loose paragraphs become one card grid, and
   * spelled as three operations no rule can tell that apart from throwing two
   * blocks away. As one operation it can be judged on its own, which is what
   * every other rule here already assumes.
   */
  | { op: "replace"; index: number; through: number; blocks: DocumentNode[] }
  | { op: "insert_after"; index: number; blocks: DocumentNode[] }
  | { op: "delete"; index: number };

const OPS = ["replace", "insert_after", "delete"] as const;

/** The blocks of the original document an operation stands in for. */
export function coveredBlocks(op: DocOp, blocks: DocumentNode[]): DocumentNode[] {
  const last = op.op === "replace" ? op.through : op.index;
  return blocks.slice(op.index, last + 1);
}

function asBlocks(value: unknown, op: string, index: number): DocumentNode[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Op ${op} at index ${index} needs a non-empty "blocks" array`);
  }
  return value as DocumentNode[];
}

/**
 * Model output → ops, or throw. Throwing is deliberate: it feeds the same retry
 * loop as schema validation, so a malformed op list is re-asked rather than
 * partially applied.
 */
export function parseOps(json: unknown, blockCount: number): DocOp[] {
  if (!Array.isArray(json)) throw new Error("Expected a JSON array of operations");
  return json.map((raw, i) => {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(`Operation ${i} is not an object`);
    }
    const { op, index } = raw as { op?: unknown; index?: unknown };
    if (typeof op !== "string" || !OPS.includes(op as (typeof OPS)[number])) {
      throw new Error(`Operation ${i} has an unknown "op": ${JSON.stringify(op)}`);
    }
    if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= blockCount) {
      throw new Error(
        `Operation ${i} ("${op}") targets index ${JSON.stringify(index)}, outside 0..${blockCount - 1}`,
      );
    }
    const at = index as number;
    if (op === "delete") return { op, index: at };
    const blocks = asBlocks((raw as { blocks?: unknown }).blocks, op, at);
    if (op === "insert_after") return { op, index: at, blocks };
    return { op: "replace", index: at, through: spanEnd(raw, at, blockCount), blocks };
  });
}

/**
 * How far a replace reaches, defaulting to the block it addresses. A span that
 * ends before it starts, or past the last block, is refused rather than
 * clamped: it means the model addressed a document other than the one it was
 * given, and applying part of that is worse than asking again.
 */
function spanEnd(raw: unknown, index: number, blockCount: number): number {
  const { through } = raw as { through?: unknown };
  if (through === undefined || through === null) return index;
  if (!Number.isInteger(through) || (through as number) < index || (through as number) >= blockCount) {
    throw new Error(
      `Operation at index ${index} has a "through" of ${JSON.stringify(through)}, outside ${index}..${blockCount - 1}`,
    );
  }
  return through as number;
}

/** Rank deciding which op wins when two target the same index — see applyOps. */
const ORDER: Record<DocOp["op"], number> = { insert_after: 0, replace: 1, delete: 2 };

/**
 * Apply ops to a document. Ops address the ORIGINAL block indexes, so they are
 * applied from the highest index down: every splice then happens after the
 * positions the remaining ops still refer to.
 *
 * At an equal index, `insert_after` runs first so its blocks are already parked
 * beyond the target before a `replace`/`delete` disturbs it.
 */
export function applyOps(doc: DocumentNode, ops: DocOp[]): DocumentNode {
  const content = [...(doc.content ?? [])];
  const ordered = [...ops].sort(
    (a, b) => b.index - a.index || ORDER[a.op] - ORDER[b.op],
  );
  for (const op of ordered) {
    if (op.op === "delete") content.splice(op.index, 1);
    else if (op.op === "replace") content.splice(op.index, op.through - op.index + 1, ...op.blocks);
    else content.splice(op.index + 1, 0, ...op.blocks);
  }
  // ProseMirror rejects an empty doc; a transform that deleted everything gets
  // the same empty paragraph a blank document starts from.
  if (content.length === 0) content.push({ type: "paragraph" });
  return { ...doc, content };
}
