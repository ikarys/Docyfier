import type { Agent } from "@/domain/authoring/agents/contract";
import { opBreach } from "@/domain/authoring/agents/layout-ops";
import type { DocumentBrief } from "@/domain/authoring/brief";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { coveredBlocks, parseOps, type DocOp } from "@/domain/authoring/ops";
import {
  transformOpsPrompt,
  transformOpsSystem,
  writerSystem,
} from "@/domain/authoring/prompts";
import { DEFAULT_RECIPE, findRecipe } from "@/domain/authoring/recipes/catalog";
import { blocksOf, type DocumentBody, type DocumentNode } from "@/domain/documents/body";
import { effortFor, tokensFor } from "@/domain/authoring/thinking";
import { askDocument, askOnce, bodyFromAnswer, blocksFromAnswer, polished } from "./ask-model";
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
    return { ...op, blocks: blocksFromAnswer(deps, op.blocks) };
  });
}

/**
 * The ops in this answer, or null when it is not an op list at all.
 *
 * The contract asks for ops; a model that answers with the document instead has
 * still done the work, and refusing it would cost a retry to arrive at
 * something usable. An answer that IS an op list but a malformed one throws, so
 * the retry gets its reason.
 */
function opsFrom(deps: AuthoringDeps, text: string, blockCount: number): DocOp[] | null {
  let json: unknown;
  try {
    json = jsonFromAnswer(text);
  } catch {
    return null;
  }
  if (!Array.isArray(json) || !looksLikeOps(json)) return null;
  return readOps(deps, json, blockCount);
}

/**
 * Every op held to the charter of the assistant that produced it (STEP U13).
 * Thrown from inside the reader, so the existing retry asks again with the
 * reason rather than applying an edit that broke the split.
 */
function inLane(agent: Agent | undefined, ops: DocOp[], blocks: DocumentNode[]): DocOp[] {
  if (!agent) return ops;
  for (const op of ops) {
    const breach = opBreach(agent.id, op, coveredBlocks(op, blocks));
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
  return askOnce(
    deps,
    {
      system: transformOpsSystem(deps.style, agent),
      prompt: transformOpsPrompt(blocks.map((block) => deps.writer.write([block])), instruction),
      temperature: agent ? agent.temperature : 0.3,
      effort: effortFor("document"),
    maxTokens: tokensFor("document"),
    },
    (text): TransformOutcome => {
      const ops = opsFrom(deps, text, blocks.length);
      return ops
        ? { kind: "ops", ops: inLane(agent, ops, blocks) }
        : { kind: "doc", content: polished(deps, bodyFromAnswer(deps, text)) };
    },
  );
}
