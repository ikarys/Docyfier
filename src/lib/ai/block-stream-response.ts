import "server-only";
import { streamText } from "ai";
import type { StyleParameters } from "@/domain/authoring/style-parameters";
import type { DocumentNode } from "@/domain/documents/body";
import type { ThinkingEffort } from "@/domain/authoring/text-generator";
import { reasoningOptions } from "@/infrastructure/authoring/openai-compatible/endpoint";
import { logUsage } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { line, providerMessage as message } from "./ndjson";
import { emptyRead, readAnswer, type Part } from "./read-block-stream";
import { callOptions, isTimeout, languageModel, timeoutMessage } from "./provider";
import { getAiSettings } from "@/lib/settings";

/**
 * A model answer read as it is written, one finished top-level block at a time
 * (PLAN.md STEP U4, widened in U11).
 *
 * Two surfaces stream blocks — writing a whole document from a prompt, and
 * writing at the caret — and they differ only in the prompt they open with.
 * Everything else is the same rule: commit to a 200 only once the first token
 * has arrived, so a provider failure is a failed request the caller can retry
 * through the blocking path; then report every later problem inside the stream,
 * because whatever already reached the editor stays.
 */

export interface BlockStream {
  readonly system: string;
  readonly prompt: string;
  readonly temperature: number;
  /** How much thinking this surface is worth; absent leaves the model to itself. */
  readonly effort?: ThinkingEffort;
  /** The most this answer may cost, capped again by what the provider allows. */
  readonly maxTokens?: number;
  /** The instance's writing style: the same pass the blocking path applies. */
  readonly style: StyleParameters;
  /** An NDJSON line to send before the first block — the document's dress. */
  readonly prelude?: Record<string, unknown>;
  /**
   * What the finished answer was not allowed to be, or "" when it is fine.
   *
   * A rule that compares the answer to what was asked cannot run block by
   * block, so it runs once at the end. There is no retry left at that point:
   * the verdict is reported as the stream's error, and the caller — which is
   * the only thing that knows what it inserted — takes the answer back.
   */
  verdict?(blocks: DocumentNode[]): string;
}

interface Opened {
  parts: AsyncIterator<Part>;
  firstText: string | null;
  failure: unknown;
  /** Characters the model thought before it wrote anything, or before it gave up. */
  thinking: number;
  usage: unknown;
}

/**
 * Read up to the first token before committing to a 200: whatever goes wrong
 * this early must surface as a failed request rather than as half a document.
 */
async function open(request: BlockStream): Promise<Opened> {
  try {
    const endpoint = await getAiSettings();
    // `fullStream`, not `textStream`: the SDK reports provider failures as an
    // `error` part rather than by throwing, so a rate-limited or misconfigured
    // server would otherwise look like a perfectly successful empty answer.
    const parts = streamText({
      model: await languageModel(),
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxOutputTokens: Math.min(endpoint.maxOutputTokens, request.maxTokens ?? Infinity),
      ...reasoningOptions(endpoint, request.effort),
      ...callOptions(),
    }).fullStream[Symbol.asyncIterator]();

    let thinking = 0;
    let usage: unknown = null;
    for (;;) {
      const next = await parts.next();
      if (next.done) return { parts, firstText: null, failure: null, thinking, usage };
      if (next.value.type === "text-delta") {
        return { parts, firstText: next.value.text, failure: null, thinking, usage };
      }
      // A model can deliberate its whole output budget away and write nothing.
      // Counted here as well as in the read, because that answer never gets one.
      if (next.value.type === "reasoning-delta") thinking += next.value.text.length;
      if (next.value.type === "finish") usage = next.value.totalUsage;
      if (next.value.type === "error") {
        return { parts, firstText: null, failure: next.value.error, thinking, usage };
      }
    }
  } catch (err) {
    return { parts: emptyParts(), firstText: null, failure: err, thinking: 0, usage: null };
  }
}

function emptyParts(): AsyncIterator<Part> {
  return { next: async () => ({ done: true, value: undefined as never }) };
}

/** The blocks, as NDJSON, or a 502 explaining why the stream never opened. */
export async function blockStreamResponse(request: BlockStream): Promise<Response> {
  const started = Date.now();
  const { parts, firstText, failure, thinking, usage } = await open(request);

  if (firstText === null) {
    console.error("[ai] streaming answer failed:", failure);
    // An answer that never started still took the seconds it took, and on a
    // reasoning model those seconds are the whole finding.
    logUsage("stream", started, usage, { chars: 0, thinking });
    return Response.json(
      {
        error: isTimeout(failure)
          ? timeoutMessage()
          : failure
            ? message(failure)
            : "The AI returned nothing.",
      },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const read = emptyRead();
      read.answer.thinking = thinking;
      read.usage = usage;
      const send = (block: unknown) => controller.enqueue(encoder.encode(line({ block })));

      try {
        if (request.prelude) controller.enqueue(encoder.encode(line(request.prelude)));
        await readAnswer({ parts, firstText }, request.style, send, read);

        const breach = read.stopped ? "" : (request.verdict?.(read.written) ?? "");
        const failed = read.stopped ?? (breach || null);
        const { blocks, skipped } = read;
        controller.enqueue(
          encoder.encode(
            failed ? line({ error: failed, blocks }) : line({ done: true, blocks, skipped }),
          ),
        );
      } catch (err) {
        console.error("[ai] streaming answer interrupted:", err);
        controller.enqueue(encoder.encode(line({ error: message(err), blocks: read.blocks })));
      } finally {
        // Here rather than on the `finish` part: a scanner that has seen the
        // closing bracket stops reading, so on every answer that arrived whole
        // the part carrying the usage is never reached.
        logUsage("stream", started, read.usage, read.answer);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
