"use client";

import { useState } from "react";

/**
 * One try at a server action the user asked for by hand — testing a connection,
 * importing documents — and what to show while it runs.
 *
 * These actions report failure as a value rather than by throwing, so the four
 * states are the same every time; only the payload changes.
 */
export type Outcome<T> = ({ ok: true } & T) | { ok: false; error: string };

export type Attempt<T> =
  | { state: "idle" }
  | { state: "running" }
  | { state: "done"; result: T }
  | { state: "failed"; message: string };

export function useAttempt<T>(): {
  attempt: Attempt<T>;
  run: (action: () => Promise<Outcome<T>>) => Promise<void>;
} {
  const [attempt, setAttempt] = useState<Attempt<T>>({ state: "idle" });

  const run = async (action: () => Promise<Outcome<T>>) => {
    setAttempt({ state: "running" });
    const outcome = await action();
    setAttempt(
      outcome.ok
        ? { state: "done", result: outcome as unknown as T }
        : { state: "failed", message: outcome.error },
    );
  };

  return { attempt, run };
}
