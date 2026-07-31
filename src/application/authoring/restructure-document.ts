import { designer } from "@/domain/authoring/agents/designer";
import { opBreach } from "@/domain/authoring/agents/layout-ops";
import { outlineOf } from "@/domain/authoring/document-digest";
import { parseLayoutPlan, type LayoutIntent } from "@/domain/authoring/layout-plan";
import { coveredBlocks, type DocOp } from "@/domain/authoring/ops";
import {
  agentSystem,
  layoutPlanPrompt,
  layoutPlanSystem,
  selectionBlocksPrompt,
} from "@/domain/authoring/prompts";
import { effortFor } from "@/domain/authoring/thinking";
import type { DocumentNode } from "@/domain/documents/body";
import { askJson, askOnce, blocksFromAnswer } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/**
 * Restructuring a whole document, decided once and produced in pieces
 * (PLAN.md STEP U14).
 *
 * The single call this replaces spent 84% of its output deliberating: it had to
 * decide what deserved a richer block and build it, over the whole document, in
 * one answer. Here the deciding is one small call over an outline, and each
 * decision is then carried out on its own — a span of blocks and the box it
 * goes into, which is the same bounded job the per-block actions already do
 * well. Those run together, so the wait is the plan plus the slowest of them
 * rather than the sum of everything.
 */

/** How many spans are produced at once. Enough to hide the wait, few enough to
 * stay a fair neighbour to a self-hosted model serving one user. */
const AT_ONCE = 4;

async function plan(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  instruction: string,
): Promise<LayoutIntent[]> {
  return askJson(
    deps,
    {
      system: layoutPlanSystem(deps.style),
      prompt: layoutPlanPrompt(outlineOf(blocks), instruction),
      temperature: designer.temperature,
      effort: effortFor("document"),
    },
    (json) => parseLayoutPlan(json, blocks.length),
  );
}

/**
 * One intent carried out, or nothing. A span the assistant got wrong costs its
 * own span: the others were decided independently and are still worth applying,
 * which is the whole reason for planning first.
 */
async function carryOut(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  intent: LayoutIntent,
): Promise<DocOp | null> {
  const span = blocks.slice(intent.from, intent.through + 1);
  try {
    const written = await askOnce(
      deps,
      {
        system: agentSystem(designer, deps.style),
        prompt: selectionBlocksPrompt(
          deps.writer.write(span),
          `Present this as one ${intent.as}.`,
        ),
        temperature: designer.temperature,
        effort: effortFor("passage"),
      },
      (text) => blocksFromAnswer(deps, text),
    );
    const op: DocOp = { op: "replace", index: intent.from, through: intent.through, blocks: written };
    const breach = opBreach(designer.id, op, coveredBlocks(op, blocks));
    if (breach) throw new Error(breach);
    return op;
  } catch (err) {
    console.error(`[ai] span ${intent.from}..${intent.through} as ${intent.as} dropped:`, err);
    return null;
  }
}

export async function* restructureDocument(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  instruction: string,
): AsyncGenerator<DocOp> {
  const intents = await plan(deps, blocks, instruction);

  for (let at = 0; at < intents.length; at += AT_ONCE) {
    const batch = intents.slice(at, at + AT_ONCE);
    const ops = await Promise.all(batch.map((intent) => carryOut(deps, blocks, intent)));
    for (const op of ops) if (op) yield op;
  }
}
