import { streamText } from "ai";
import { readOps } from "@/application/authoring/write-documents";
import { bodyFromJson, polished } from "@/application/authoring/ask-model";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { transformOpsPrompt, transformOpsSystem } from "@/domain/authoring/prompts";
import type { AgentId } from "@/domain/authoring/agents/contract";
import type { DocOp } from "@/domain/authoring/ops";
import { blocksOf, type DocumentBody, type DocumentNode } from "@/domain/documents/body";
import { agentById } from "@/domain/authoring/agents/catalog";
import { opBreach } from "@/domain/authoring/agents/layout-ops";
import { routeSurface, type Surface } from "@/domain/authoring/agents/routing";
import { reasoningOptions } from "@/infrastructure/authoring/openai-compatible/endpoint";
import { logUsage } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { isAuthorized } from "@/lib/auth";
import { ndjsonResponse } from "@/lib/ai/ndjson";
import { callTimeoutMs, languageModel } from "@/lib/ai/provider";
import { authoringDeps } from "@/lib/ai/service";
import { withHeartbeat } from "@/lib/ai/stream-heartbeat";
import { transformLines, type ModelPart } from "@/lib/ai/transform-stream";
import { getAiSettings } from "@/lib/settings";

/**
 * Surface 2, streaming — a whole-document edit, one NDJSON `{"op":…}` line per
 * operation, then a terminal `{"done":…}` or `{"error":…}`.
 *
 * The blocking action is still there and still correct; what it cannot do is
 * stay silent for minutes on a long document without a proxy between browser
 * and app closing the connection. Here the first bytes leave immediately and a
 * `{"beat":true}` goes out every few seconds while the model thinks, so the
 * only clock that can end the request is the silence limit below.
 */

/**
 * One operation, held to the charter of the assistant that produced it. Thrown
 * rather than returned: the stream already drops an operation it cannot accept
 * and reports the count, so a drifting edit costs its own block and nothing of
 * what the assistant got right.
 */
function inLane(agent: AgentId, op: DocOp, blocks: DocumentNode[]): DocOp {
  const breach = opBreach(agent, op, blocks[op.index]);
  if (breach) throw new Error(breach);
  return op;
}

/** How long a silence may last before a beat goes out to hold the connection. */
const BEAT_MS = 5_000;

interface TransformRequest {
  content?: DocumentBody;
  instruction?: string;
  /** What the user did, so the assistant is chosen without a second call. */
  surface?: Surface;
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) return new Response("Unauthorized", { status: 401 });

  const { content, instruction, surface } = (await req.json()) as TransformRequest;
  if (!content || typeof content !== "object" || !Array.isArray(content.content)) {
    return Response.json({ error: "Missing document" }, { status: 400 });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return Response.json({ error: "Missing instruction" }, { status: 400 });
  }

  const authoring = await authoringDeps();
  const blocks = blocksOf(content);
  const endpoint = await getAiSettings();

  // One assistant per stream: a button already says which one, and a request
  // that wants both is answered by the writer here — laying the result out is
  // the next thing the user asks for, on a document that has settled.
  const assignment = routeSurface(surface ?? { kind: "free-prompt" });
  const agent = agentById(assignment.steps[0] ?? "writer");
  // Ours to cancel: the deadline is silence, not total duration, so the abort
  // comes from the reader below rather than from a timer set here.
  const aborter = new AbortController();

  const parts = streamText({
    model: await languageModel(),
    system: transformOpsSystem(authoring.style, agent),
    prompt: transformOpsPrompt(blocks, instruction),
    temperature: agent.temperature,
    maxOutputTokens: endpoint.maxOutputTokens,
    ...reasoningOptions(endpoint, agent.effort),
    abortSignal: aborter.signal,
    maxRetries: 1,
  }).fullStream[Symbol.asyncIterator]() as AsyncIterator<ModelPart>;

  const events = withHeartbeat(logWhenDone(parts, Date.now()), {
    every: BEAT_MS,
    idleLimit: callTimeoutMs(),
  });
  const lines = transformLines(events, {
    op: (raw) => inLane(agent.id, readOps(authoring, [raw], blocks.length)[0], blocks),
    doc: (text) => polished(authoring, bodyFromJson(authoring, jsonFromAnswer(text))),
  });

  return ndjsonResponse(hangUpAfter(lines, aborter));
}

/**
 * The same stream, with the cost of the call written down as it closes. A
 * whole-document edit is the longest wait in the product, so it is the one
 * worth knowing the shape of: tokens written, tokens thought, seconds spent.
 */
function logWhenDone(parts: AsyncIterator<ModelPart>, started: number): AsyncIterator<ModelPart> {
  return {
    async next() {
      const step = await parts.next();
      if (!step.done && step.value.type === "finish") {
        logUsage("transform", started, step.value.totalUsage);
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
