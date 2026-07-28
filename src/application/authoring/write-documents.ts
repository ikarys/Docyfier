import { parseOps, type DocOp } from "@/domain/authoring/ops";
import {
  GENERATE_SYSTEM,
  TRANSFORM_OPS_SYSTEM,
  transformOpsPrompt,
} from "@/domain/authoring/prompts";
import { blocksOf, type DocumentBody, type DocumentNode } from "@/domain/documents/body";
import { askDocument, askJson, bodyFromJson, polished } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/** The two whole-document AI surfaces: writing one, and editing one. */

/** Surface 1 — prompt-to-document. */
export function generateDocument(
  deps: AuthoringDeps,
  prompt: string,
): Promise<DocumentBody> {
  return askDocument(deps, { system: GENERATE_SYSTEM, prompt, temperature: 0.7 });
}

/**
 * Result of surface 2: normally a list of edits addressing individual blocks;
 * `doc` is the fallback for a model that answered with a whole document anyway.
 */
export type TransformOutcome =
  | { kind: "ops"; ops: DocOp[] }
  | { kind: "doc"; content: DocumentBody };

/** An array of ops, or an array of blocks the model returned instead. */
function looksLikeOps(json: unknown[]): boolean {
  return json.every((item) => typeof item === "object" && item !== null && "op" in item);
}

/** Validate — and deterministically polish — the blocks each op carries. */
function readOps(deps: AuthoringDeps, json: unknown, blockCount: number): DocOp[] {
  return parseOps(json, blockCount).map((op) => {
    if (op.op === "delete") return op;
    const body = bodyFromJson(deps, { type: "doc", content: op.blocks });
    return { ...op, blocks: (polished(deps, body).content ?? []) as DocumentNode[] };
  });
}

/**
 * Surface 2 — whole-document transform (side panel, "make it pretty").
 *
 * The contract asks for ops so untouched sections are never rewritten; a model
 * that ignores it and returns a document is still honoured, as a replacement.
 */
export function transformDocument(
  deps: AuthoringDeps,
  body: DocumentBody,
  instruction: string,
): Promise<TransformOutcome> {
  const blocks = blocksOf(body);
  return askJson(
    deps,
    {
      system: TRANSFORM_OPS_SYSTEM,
      prompt: transformOpsPrompt(blocks, instruction),
      temperature: 0.3,
      // An op list is an array: no provider JSON mode describes it.
      shape: "free",
    },
    (json): TransformOutcome =>
      Array.isArray(json) && looksLikeOps(json)
        ? { kind: "ops", ops: readOps(deps, json, blocks.length) }
        : { kind: "doc", content: polished(deps, bodyFromJson(deps, json)) },
  );
}
