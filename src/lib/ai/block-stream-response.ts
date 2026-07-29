import "server-only";
import { streamText, type TextStreamPart, type ToolSet } from "ai";
import { beautify } from "@/domain/authoring/beautify";
import { parseModelJson } from "@/domain/authoring/model-answer";
import type { StyleParameters } from "@/domain/authoring/style-parameters";
import { validateDocJson } from "@/infrastructure/editor/schema";
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
  /** The instance's writing style: the same pass the blocking path applies. */
  readonly style: StyleParameters;
  /** An NDJSON line to send before the first block — the document's dress. */
  readonly prelude?: Record<string, unknown>;
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
    const { maxOutputTokens } = await getAiSettings();
    // `fullStream`, not `textStream`: the SDK reports provider failures as an
    // `error` part rather than by throwing, so a rate-limited or misconfigured
    // server would otherwise look like a perfectly successful empty answer.
    const parts = streamText({
      model: await languageModel(),
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      maxOutputTokens,
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

/** The blocks, as NDJSON, or a 502 explaining why the stream never opened. */
export async function blockStreamResponse(request: BlockStream): Promise<Response> {
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
      const scanner = new BlockScanner();
      let blocks = 0;
      let skipped = 0;

      const emit = (raw: string) => {
        try {
          controller.enqueue(encoder.encode(line({ block: prepare(raw, request.style) })));
          blocks++;
        } catch (err) {
          // A block the schema rejects is dropped rather than aborting the
          // answer; the count is reported in the terminal line.
          console.error("[ai] streamed block rejected:", message(err));
          skipped++;
        }
      };

      try {
        let stopped: string | null = null;
        if (request.prelude) controller.enqueue(encoder.encode(line(request.prelude)));
        for (const raw of scanner.push(firstText)) emit(raw);

        while (!scanner.finished) {
          const next = await parts.next();
          if (next.done) break;
          if (next.value.type === "text-delta") {
            for (const raw of scanner.push(next.value.text)) emit(raw);
          } else if (next.value.type === "error") {
            stopped = message(next.value.error);
            break;
          } else if (next.value.type === "finish" && next.value.finishReason === "length") {
            stopped = "The answer was cut short — raise Max output tokens in Settings.";
          }
        }

        controller.enqueue(
          encoder.encode(
            stopped ? line({ error: stopped, blocks }) : line({ done: true, blocks, skipped }),
          ),
        );
      } catch (err) {
        console.error("[ai] streaming answer interrupted:", err);
        controller.enqueue(encoder.encode(line({ error: message(err), blocks })));
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
