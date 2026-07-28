import { streamText } from "ai";
import { readOps } from "@/application/authoring/write-documents";
import { bodyFromJson, polished } from "@/application/authoring/ask-model";
import { jsonFromAnswer } from "@/domain/authoring/model-answer";
import { transformOpsPrompt, transformOpsSystem } from "@/domain/authoring/prompts";
import { blocksOf, type DocumentBody } from "@/domain/documents/body";
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

/** How long a silence may last before a beat goes out to hold the connection. */
const BEAT_MS = 5_000;

interface TransformRequest {
  content?: DocumentBody;
  instruction?: string;
}

export async function POST(req: Request): Promise<Response> {
  if (!(await isAuthorized())) return new Response("Unauthorized", { status: 401 });

  const { content, instruction } = (await req.json()) as TransformRequest;
  if (!content || typeof content !== "object" || !Array.isArray(content.content)) {
    return Response.json({ error: "Missing document" }, { status: 400 });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return Response.json({ error: "Missing instruction" }, { status: 400 });
  }

  const authoring = await authoringDeps();
  const blocks = blocksOf(content);
  const { maxOutputTokens } = await getAiSettings();
  // Ours to cancel: the deadline is silence, not total duration, so the abort
  // comes from the reader below rather than from a timer set here.
  const aborter = new AbortController();

  const parts = streamText({
    model: await languageModel(),
    system: transformOpsSystem(authoring.style),
    prompt: transformOpsPrompt(blocks, instruction),
    temperature: 0.3,
    maxOutputTokens,
    abortSignal: aborter.signal,
    maxRetries: 1,
  }).fullStream[Symbol.asyncIterator]() as AsyncIterator<ModelPart>;

  const events = withHeartbeat(parts, { every: BEAT_MS, idleLimit: callTimeoutMs() });
  const lines = transformLines(events, {
    op: (raw) => readOps(authoring, [raw], blocks.length)[0],
    doc: (text) => polished(authoring, bodyFromJson(authoring, jsonFromAnswer(text))),
  });

  return ndjsonResponse(hangUpAfter(lines, aborter));
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
