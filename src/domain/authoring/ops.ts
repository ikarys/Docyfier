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
  | { op: "replace"; index: number; blocks: DocumentNode[] }
  | { op: "insert_after"; index: number; blocks: DocumentNode[] }
  | { op: "delete"; index: number };

const OPS = ["replace", "insert_after", "delete"] as const;

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
    return { op: op as "replace" | "insert_after", index: at, blocks: asBlocks((raw as { blocks?: unknown }).blocks, op, at) };
  });
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
    else if (op.op === "replace") content.splice(op.index, 1, ...op.blocks);
    else content.splice(op.index + 1, 0, ...op.blocks);
  }
  // ProseMirror rejects an empty doc; a transform that deleted everything gets
  // the same empty paragraph a blank document starts from.
  if (content.length === 0) content.push({ type: "paragraph" });
  return { ...doc, content };
}
