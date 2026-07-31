import "server-only";
import { streamText } from "ai";
import { readOps } from "@/application/authoring/write-documents";
import { bodyFromJson, polished } from "@/application/authoring/ask-model";
import type { AuthoringDeps } from "@/application/authoring/deps";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { transformOpsPrompt, transformOpsSystem } from "@/domain/authoring/prompts";
import type { Agent } from "@/domain/authoring/agents/contract";
import { opBreach } from "@/domain/authoring/agents/layout-ops";
import { coveredBlocks, type DocOp } from "@/domain/authoring/ops";
import type { DocumentNode } from "@/domain/documents/body";
import { effortFor } from "@/domain/authoring/thinking";
import { reasoningOptions } from "@/infrastructure/authoring/openai-compatible/endpoint";
import { logUsage, type AnswerSize } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { callTimeoutMs, languageModel } from "./provider";
import { withHeartbeat } from "./stream-heartbeat";
import { transformLines, type ModelPart } from "./transform-stream";
import { getAiSettings } from "@/lib/settings";

/**
 * A whole-document edit asked for in one model call, streamed operation by
 * operation.
 *
 * It is what answers a wording pass over a document: deciding which paragraphs
 * to reword is not the planning problem laying a document out is, and the model
 * has to read the words either way. The layout pass plans first — see
 * `planned-transform.ts`.
 */

/** How long a silence may last before a beat goes out to hold the connection. */
const BEAT_MS = 5_000;

/**
 * One operation, held to the charter of the assistant that produced it. Thrown
 * rather than returned: the stream already drops an operation it cannot accept
 * and reports the count, so a drifting edit costs its own block and nothing of
 * what the assistant got right.
 */
function inLane(agent: Agent, op: DocOp, blocks: DocumentNode[]): DocOp {
  const breach = opBreach(agent.id, op, coveredBlocks(op, blocks));
  if (breach) throw new Error(breach);
  return op;
}

/**
 * The same stream, with the cost of the call written down as it closes.
 *
 * The characters are counted here rather than taken from the provider, because
 * a provider that declares no reasoning still bills it as output. The gap
 * between what it charged and what reached us is the thinking it did not name.
 */
function logWhenDone(parts: AsyncIterator<ModelPart>, started: number): AsyncIterator<ModelPart> {
  const answer: AnswerSize = { chars: 0, thinking: 0 };
  return {
    async next() {
      const step = await parts.next();
      if (step.done) return step;
      const size = step.value.text?.length ?? 0;
      if (step.value.type === "text-delta") answer.chars += size;
      if (step.value.type === "reasoning-delta") answer.thinking += size;
      if (step.value.type === "finish") {
        logUsage("transform", started, step.value.totalUsage, answer);
      }
      return step;
    },
  };
}

/**
 * The provider connection dies with the answer: once the last line is out, an
 * unread stream would otherwise keep generating tokens nobody is waiting for.
 */
async function* hangUpAfter(
  lines: AsyncGenerator<Record<string, unknown>>,
  aborter: AbortController,
): AsyncGenerator<Record<string, unknown>> {
  try {
    yield* lines;
  } finally {
    aborter.abort();
  }
}

export async function modelOpLines(
  deps: AuthoringDeps,
  blocks: DocumentNode[],
  instruction: string,
  agent: Agent,
): Promise<AsyncGenerator<Record<string, unknown>>> {
  const endpoint = await getAiSettings();
  // Ours to cancel: the deadline is silence, not total duration, so the abort
  // comes from the reader below rather than from a timer set here.
  const aborter = new AbortController();

  const parts = streamText({
    model: await languageModel(),
    system: transformOpsSystem(deps.style, agent),
    prompt: transformOpsPrompt(blocks, instruction),
    temperature: agent.temperature,
    maxOutputTokens: endpoint.maxOutputTokens,
    ...reasoningOptions(endpoint, effortFor("document")),
    abortSignal: aborter.signal,
    maxRetries: 1,
  }).fullStream[Symbol.asyncIterator]() as AsyncIterator<ModelPart>;

  const events = withHeartbeat(logWhenDone(parts, Date.now()), {
    every: BEAT_MS,
    idleLimit: callTimeoutMs(),
  });
  const lines = transformLines(events, {
    op: (raw) => inLane(agent, readOps(deps, [raw], blocks.length)[0], blocks),
    doc: (text) => polished(deps, bodyFromJson(deps, jsonFromAnswer(text))),
  });

  return hangUpAfter(lines, aborter);
}
