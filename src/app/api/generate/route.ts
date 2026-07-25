import { streamText } from "ai";
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

  let chunks: AsyncIterator<string>;
  let first: IteratorResult<string>;
  try {
    const model = await languageModel();
    const { maxOutputTokens } = await getAiSettings();
    const result = streamText({
      model,
      system: GENERATE_SYSTEM,
      prompt,
      temperature: 0.7,
      maxOutputTokens,
    });
    chunks = result.textStream[Symbol.asyncIterator]();
    // Pull the first chunk here, before committing to a 200: an unreachable
    // server or a provider that refuses streaming must surface as a failed
    // request the client can retry without streaming.
    first = await chunks.next();
  } catch (err) {
    console.error("[ai] streaming generate failed:", err);
    return Response.json({ error: message(err) }, { status: 502 });
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
        for (
          let next = first;
          !next.done;
          next = await chunks.next()
        ) {
          for (const raw of scanner.push(next.value)) emit(raw);
          if (scanner.finished) break;
        }
        controller.enqueue(encoder.encode(line({ done: true, blocks, skipped })));
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
