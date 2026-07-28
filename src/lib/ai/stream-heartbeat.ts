/**
 * Keeping a slow model's stream visibly alive.
 *
 * A reverse proxy in front of the app closes a connection that produced nothing
 * for a while — nginx defaults to 60s — and the browser then reads an HTML
 * error page where it expected the answer. A model that reasons before it
 * writes, or that is simply slow on a long document, hits that easily. Beating
 * while the source is silent keeps bytes flowing; giving up after `idleLimit`
 * of silence is what a total deadline used to do, except the clock restarts at
 * every part, so a long answer is never cut short for being long.
 */

export type StreamEvent<T> =
  | { kind: "part"; part: T }
  | { kind: "beat" }
  /** The source went quiet for longer than the caller allows. */
  | { kind: "stalled" };

export interface Heartbeat {
  /** How long to wait for a part before emitting a beat. */
  every: number;
  /** How long the source may stay silent before it is abandoned. */
  idleLimit: number;
}

/** A sleep that can be dropped as soon as the race is decided. */
function beat(ms: number): { elapsed: Promise<"beat">; cancel(): void } {
  let timer: ReturnType<typeof setTimeout>;
  return {
    elapsed: new Promise<"beat">((resolve) => {
      timer = setTimeout(() => resolve("beat"), ms);
    }),
    cancel: () => clearTimeout(timer),
  };
}

export async function* withHeartbeat<T>(
  source: AsyncIterator<T>,
  { every, idleLimit }: Heartbeat,
): AsyncGenerator<StreamEvent<T>> {
  // The pending read outlives the race it lost: an async iterator has no way to
  // take a `next()` back, and asking twice would drop a part.
  let pending: Promise<IteratorResult<T>> | null = null;
  let silence = 0;

  for (;;) {
    pending ??= source.next();
    const tick = beat(every);
    const settled = await Promise.race([pending, tick.elapsed]);
    tick.cancel();

    if (settled === "beat") {
      silence += every;
      if (silence >= idleLimit) {
        yield { kind: "stalled" };
        return;
      }
      yield { kind: "beat" };
      continue;
    }

    pending = null;
    silence = 0;
    if (settled.done) return;
    yield { kind: "part", part: settled.value };
  }
}
