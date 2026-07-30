import type { Agent } from "@/domain/authoring/agents/contract";
import { opBreach } from "@/domain/authoring/agents/layout-ops";
import type { DocumentBrief } from "@/domain/authoring/brief";
import { parseOps, type DocOp } from "@/domain/authoring/ops";
import {
  transformOpsPrompt,
  transformOpsSystem,
  writerSystem,
} from "@/domain/authoring/prompts";
import { DEFAULT_RECIPE, findRecipe } from "@/domain/authoring/recipes/catalog";
import { blocksOf, type DocumentBody, type DocumentNode } from "@/domain/documents/body";
import { askDocument, askJson, bodyFromJson, polished } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/** The two whole-document AI surfaces: writing one, and editing one. */

/**
 * Surface 1 — prompt-to-document, written to the shape its brief chose. A brief
 * the planning pass could not produce still names a kind, so there is always a
 * recipe to write against.
 */
export function generateDocument(
  deps: AuthoringDeps,
  prompt: string,
  brief: DocumentBrief,
): Promise<DocumentBody> {
  const recipe = findRecipe(brief.kind) ?? DEFAULT_RECIPE;
  return askDocument(deps, {
    system: writerSystem(recipe, brief, deps.style),
    prompt,
    temperature: 0.7,
  });
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

/**
 * Validate — and deterministically polish — the blocks each op carries.
 *
 * Exported because the streaming transform reads one op at a time and must hold
 * it to exactly the same standard as the blocking one.
 */
export function readOps(deps: AuthoringDeps, json: unknown, blockCount: number): DocOp[] {
  return parseOps(json, blockCount).map((op) => {
    if (op.op === "delete") return op;
    const body = bodyFromJson(deps, { type: "doc", content: op.blocks });
    return { ...op, blocks: (polished(deps, body).content ?? []) as DocumentNode[] };
  });
}

/**
 * Every op held to the charter of the assistant that produced it (STEP U13).
 * Thrown from inside the reader, so the existing retry asks again with the
 * reason rather than applying an edit that broke the split.
 */
function inLane(agent: Agent | undefined, ops: DocOp[], blocks: DocumentNode[]): DocOp[] {
  if (!agent) return ops;
  for (const op of ops) {
    const breach = opBreach(agent.id, op, blocks[op.index]);
    if (breach) throw new Error(breach);
  }
  return ops;
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
  agent?: Agent,
): Promise<TransformOutcome> {
  const blocks = blocksOf(body);
  return askJson(
    deps,
    {
      system: transformOpsSystem(deps.style, agent ? agent.charter(deps.style) : ""),
      prompt: transformOpsPrompt(blocks, instruction),
      temperature: agent ? agent.temperature : 0.3,
      // An op list is an array: no provider JSON mode describes it.
      shape: "free",
    },
    (json): TransformOutcome =>
      Array.isArray(json) && looksLikeOps(json)
        ? { kind: "ops", ops: inLane(agent, readOps(deps, json, blocks.length), blocks) }
        : { kind: "doc", content: polished(deps, bodyFromJson(deps, json)) },
  );
}
