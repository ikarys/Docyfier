import { streamText, APICallError, type TextStreamPart, type ToolSet } from "ai";
import { languageModel } from "@/lib/ai/provider";
import { GENERATE_SYSTEM } from "@/lib/ai/prompts";
import { validateDocJson } from "@/lib/ai/doc-schema";
import { BlockScanner } from "@/lib/ai/stream-blocks";
import { beautify } from "@/lib/doc/beautify";
import { getAiSettings } from "@/lib/settings";

/**
 * Surface 1, streaming (PLAN.md STEP U4). Emits NDJSON: one `{"block":…}` line
 * per finished top-level block, then a terminal `{"done":…}` or `{"error":…}`.
 *
 * A provider that cannot stream at all fails before the response is returned,
 * so the caller gets a non-OK status and can fall back to the blocking action.
 * Once the stream is open, problems are reported inside it — whatever already
 * reached the editor stays.
 */

const line = (value: unknown) => `${JSON.stringify(value)}\n`;

function message(err: unknown): string {
  // A provider error arrives as an APICallError whose own message is generic;
  // the body is where the reason actually is (rate limit, bad model id…).
  if (APICallError.isInstance(err)) {
    console.error("[ai] APICallError from", err.url, "status", err.statusCode);
    const body = err.responseBody?.slice(0, 400);
    return body ? `${err.message} — ${body}` : err.message;
  }
  return err instanceof Error ? err.message : "AI request failed";
}

/**
 * One block through the same pipeline as the non-streaming path: schema
 * validation, then the deterministic formatter. Both rules `beautify` applies
 * are block-local, so a single-block document is a faithful wrapper.
 */
function prepare(raw: string): unknown {
  const doc = validateDocJson({ type: "doc", content: [JSON.parse(raw)] });
  const polished = beautify(doc);
  return (validateDocJson(polished).content ?? [])[0];
}

export async function POST(req: Request): Promise<Response> {
  const { prompt } = (await req.json()) as { prompt?: unknown };
  if (typeof prompt !== "string" || !prompt.trim()) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  type Part = TextStreamPart<ToolSet>;
  let parts: AsyncIterator<Part>;
  let firstText: string | null = null;
  let openError: unknown = null;

  try {
    const model = await languageModel();
    const { maxOutputTokens } = await getAiSettings();
    // `fullStream`, not `textStream`: the SDK reports provider failures as an
    // `error` part rather than by throwing, so a rate-limited or misconfigured
    // server would otherwise look like a perfectly successful empty document.
    parts = streamText({
      model,
      system: GENERATE_SYSTEM,
      prompt,
      temperature: 0.7,
      maxOutputTokens,
    }).fullStream[Symbol.asyncIterator]();

    // Read up to the first token before committing to a 200: whatever goes
    // wrong this early must surface as a failed request, so the client can
    // retry through the non-streaming path instead of showing half a document.
    for (;;) {
      const next = await parts.next();
      if (next.done) break;
      if (next.value.type === "text-delta") {
        firstText = next.value.text;
        break;
      }
      if (next.value.type === "error") {
        openError = next.value.error;
        break;
      }
    }
  } catch (err) {
    openError = err;
  }

  if (firstText === null) {
    console.error("[ai] streaming generate failed:", openError);
    return Response.json(
      { error: openError ? message(openError) : "The AI returned nothing." },
      { status: 502 },
    );
  }

  const scanner = new BlockScanner();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let blocks = 0;
      let skipped = 0;

      const emit = (raw: string) => {
        try {
          controller.enqueue(encoder.encode(line({ block: prepare(raw) })));
          blocks++;
        } catch (err) {
          // A block the schema rejects is dropped rather than aborting the
          // document; the count is reported in the terminal line.
          console.error("[ai] streamed block rejected:", message(err));
          skipped++;
        }
      };

      try {
        let failure: string | null = null;
        for (const raw of scanner.push(firstText)) emit(raw);

        while (!scanner.finished) {
          const next = await parts.next();
          if (next.done) break;
          if (next.value.type === "text-delta") {
            for (const raw of scanner.push(next.value.text)) emit(raw);
          } else if (next.value.type === "error") {
            failure = message(next.value.error);
            break;
          } else if (
            next.value.type === "finish" &&
            next.value.finishReason === "length"
          ) {
            failure = "The document was cut short — raise Max output tokens in Settings.";
          }
        }

        controller.enqueue(
          encoder.encode(
            failure
              ? line({ error: failure, blocks })
              : line({ done: true, blocks, skipped }),
          ),
        );
      } catch (err) {
        console.error("[ai] streaming generate interrupted:", err);
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
