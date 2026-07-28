import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { withHeartbeat, type StreamEvent } from "./stream-heartbeat";

/** A source whose parts are handed out on demand, so a test decides "later". */
function controllable<T>() {
  const queue: IteratorResult<T>[] = [];
  let wake: (() => void) | null = null;
  return {
    push(value: T) {
      queue.push({ done: false, value });
      wake?.();
    },
    end() {
      queue.push({ done: true, value: undefined as T });
      wake?.();
    },
    iterator: {
      async next(): Promise<IteratorResult<T>> {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
        return queue.shift()!;
      },
    } as AsyncIterator<T>,
  };
}

async function collect(
  events: AsyncGenerator<StreamEvent<string>>,
  into: StreamEvent<string>[],
): Promise<void> {
  for await (const event of events) into.push(event);
}

describe("withHeartbeat", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("passes every part through and ends with the source", async () => {
    const source = controllable<string>();
    const seen: StreamEvent<string>[] = [];
    const run = collect(withHeartbeat(source.iterator, { every: 1000, idleLimit: 5000 }), seen);

    source.push("a");
    source.push("b");
    source.end();
    await run;

    expect(seen).toEqual([
      { kind: "part", part: "a" },
      { kind: "part", part: "b" },
    ]);
  });

  it("beats while the model is silent, so nothing between sees a dead connection", async () => {
    const source = controllable<string>();
    const seen: StreamEvent<string>[] = [];
    const run = collect(withHeartbeat(source.iterator, { every: 1000, idleLimit: 10_000 }), seen);

    await vi.advanceTimersByTimeAsync(2500);
    expect(seen).toEqual([{ kind: "beat" }, { kind: "beat" }]);

    source.push("a");
    source.end();
    await run;
    expect(seen.at(-1)).toEqual({ kind: "part", part: "a" });
  });

  it("gives up once the silence outlasts the idle limit", async () => {
    const source = controllable<string>();
    const seen: StreamEvent<string>[] = [];
    const run = collect(withHeartbeat(source.iterator, { every: 1000, idleLimit: 3000 }), seen);

    await vi.advanceTimersByTimeAsync(3000);
    await run;

    expect(seen.filter((event) => event.kind === "stalled")).toHaveLength(1);
    expect(seen.at(-1)).toEqual({ kind: "stalled" });
  });

  it("counts the silence from the last part, not from the start", async () => {
    const source = controllable<string>();
    const seen: StreamEvent<string>[] = [];
    const run = collect(withHeartbeat(source.iterator, { every: 1000, idleLimit: 3000 }), seen);

    await vi.advanceTimersByTimeAsync(2000);
    source.push("a");
    await vi.advanceTimersByTimeAsync(2000);
    expect(seen.some((event) => event.kind === "stalled")).toBe(false);

    source.end();
    await run;
  });
});
