import "server-only";
import { streamText, type TextStreamPart, type ToolSet } from "ai";
import { beautify } from "@/domain/authoring/beautify";
import { parseModelJson } from "@/domain/authoring/model-answer";
import type { StyleParameters } from "@/domain/authoring/style-parameters";
import type { DocumentNode } from "@/domain/documents/body";
import type { ThinkingEffort } from "@/domain/authoring/text-generator";
import { validateDocJson } from "@/infrastructure/editor/schema";
import { reasoningOptions } from "@/infrastructure/authoring/openai-compatible/endpoint";
import { logUsage } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { line, providerMessage as message } from "./ndjson";
import { callOptions, isTimeout, languageModel, timeoutMessage } from "./provider";
import { BlockScanner } from "./stream-blocks";
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

/**
 * One block through the same pipeline as the non-streaming path: schema
 * validation, then the deterministic formatter. Both rules `beautify` applies
 * are block-local, so a single-block document is a faithful wrapper.
 */
function prepare(raw: string, style: StyleParameters): unknown {
  const doc = validateDocJson({ type: "doc", content: [parseModelJson(raw)] });
  const polished = beautify(doc, style);
  return (validateDocJson(polished).content ?? [])[0];
}

type Part = TextStreamPart<ToolSet>;

interface Opened {
  parts: AsyncIterator<Part>;
  firstText: string | null;
  failure: unknown;
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
      maxOutputTokens: endpoint.maxOutputTokens,
      ...reasoningOptions(endpoint, request.effort),
      ...callOptions(),
    }).fullStream[Symbol.asyncIterator]();

    for (;;) {
      const next = await parts.next();
      if (next.done) return { parts, firstText: null, failure: null };
      if (next.value.type === "text-delta") {
        return { parts, firstText: next.value.text, failure: null };
      }
      if (next.value.type === "error") {
        return { parts, firstText: null, failure: next.value.error };
      }
    }
  } catch (err) {
    return { parts: emptyParts(), firstText: null, failure: err };
  }
}

function emptyParts(): AsyncIterator<Part> {
  return { next: async () => ({ done: true, value: undefined as never }) };
}

/** Everything one answer turned out to be, filled in as it is read. */
interface Read {
  /** Why the answer ended badly, or null when it ended. */
  stopped: string | null;
  written: DocumentNode[];
  blocks: number;
  skipped: number;
  /** Characters of model text read, so the wait can be told apart from the answer. */
  chars: number;
  usage: unknown;
}

function emptyRead(): Read {
  return { stopped: null, written: [], blocks: 0, skipped: 0, chars: 0, usage: null };
}

/**
 * Read the answer to its end, handing each accepted block over as it closes.
 *
 * Filling a `Read` the caller owns rather than returning one: a stream that
 * throws halfway still spent whatever it spent, and the log is the only place
 * that says so.
 */
async function readAnswer(
  source: { parts: AsyncIterator<Part>; firstText: string },
  request: BlockStream,
  send: (block: unknown) => void,
  read: Read,
): Promise<void> {
  const scanner = new BlockScanner();

  const emit = (raw: string) => {
    try {
      const block = prepare(raw, request.style);
      send(block);
      read.written.push(block as DocumentNode);
      read.blocks++;
    } catch (err) {
      // A block the schema rejects is dropped rather than aborting the answer;
      // the count is reported in the terminal line.
      console.error("[ai] streamed block rejected:", message(err));
      read.skipped++;
    }
  };

  read.chars += source.firstText.length;
  for (const raw of scanner.push(source.firstText)) emit(raw);

  while (!scanner.finished) {
    const next = await source.parts.next();
    if (next.done) break;
    if (next.value.type === "text-delta") {
      read.chars += next.value.text.length;
      for (const raw of scanner.push(next.value.text)) emit(raw);
    } else if (next.value.type === "error") {
      read.stopped = message(next.value.error);
      break;
    } else if (next.value.type === "finish") {
      read.usage = next.value.totalUsage;
      if (next.value.finishReason === "length") {
        read.stopped = "The answer was cut short — raise Max output tokens in Settings.";
      }
    }
  }
}

/** The blocks, as NDJSON, or a 502 explaining why the stream never opened. */
export async function blockStreamResponse(request: BlockStream): Promise<Response> {
  const started = Date.now();
  const { parts, firstText, failure } = await open(request);

  if (firstText === null) {
    console.error("[ai] streaming answer failed:", failure);
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
      const send = (block: unknown) => controller.enqueue(encoder.encode(line({ block })));

      try {
        if (request.prelude) controller.enqueue(encoder.encode(line(request.prelude)));
        await readAnswer({ parts, firstText }, request, send, read);

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
        logUsage("stream", started, read.usage, read.chars);
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
