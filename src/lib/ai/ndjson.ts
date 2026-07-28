import { APICallError } from "ai";

/**
 * The wire the streaming AI routes answer on: one JSON record per line, so the
 * editor can act on the first one long before the model is done.
 */

export const line = (value: unknown): string => `${JSON.stringify(value)}\n`;

/**
 * What a user reads when a call fails. A provider error arrives as an
 * `APICallError` whose own message is generic; the body is where the reason
 * actually is (rate limit, unknown model id, an HTML page from a proxy).
 */
export function providerMessage(err: unknown): string {
  if (APICallError.isInstance(err)) {
    console.error("[ai] APICallError from", err.url, "status", err.statusCode);
    const body = err.responseBody?.slice(0, 400);
    return body ? `${err.message} — ${body}` : err.message;
  }
  return err instanceof Error ? err.message : "AI request failed";
}

/** An NDJSON response over a generator of records. */
export function ndjsonResponse(
  records: AsyncGenerator<Record<string, unknown>>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await records.next();
      if (next.done) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(line(next.value)));
    },
    cancel: (reason) => void records.return?.(reason),
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
