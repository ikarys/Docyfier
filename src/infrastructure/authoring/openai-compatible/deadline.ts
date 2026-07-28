/**
 * How long one model call may take before it is abandoned.
 *
 * Without a deadline a provider that accepts the connection and then stops
 * answering hangs the request for as long as the process lives: the editor
 * shows "Rewriting…" forever, with no error and no way to retry. Generous
 * enough for a long document on a slow endpoint, finite enough that a stalled
 * proxy surfaces as a message. Override with `DOCYFIER_LLM_TIMEOUT_MS`.
 */
const DEFAULT_TIMEOUT_MS = 90_000;

export function callTimeoutMs(): number {
  const configured = Number(process.env.DOCYFIER_LLM_TIMEOUT_MS);
  return Number.isInteger(configured) && configured > 0
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

/**
 * Options every generation call passes.
 *
 * The retry budget matters as much as the deadline: these calls sit inside
 * retry loops of their own, so the SDK default of two retries would turn one
 * user action into six unbounded requests.
 */
export function callOptions(): { abortSignal: AbortSignal; maxRetries: number } {
  return { abortSignal: AbortSignal.timeout(callTimeoutMs()), maxRetries: 1 };
}

/**
 * True when a call was cut short by our own deadline rather than refused by the
 * server. `AbortSignal.timeout` raises a `TimeoutError`, which the SDK wraps, so
 * the whole `cause` chain is walked — bounded, because a wrapper is free to
 * build a cycle.
 */
export function isTimeout(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; current && depth < 8; depth++) {
    const { name } = current as { name?: unknown };
    if (name === "TimeoutError" || name === "AbortError") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/** What the user is told when the deadline is what stopped the call. */
export function timeoutMessage(): string {
  const seconds = Math.round(callTimeoutMs() / 1000);
  return `The AI server did not answer within ${seconds}s. It may be overloaded, or the request may be too large — try again, select a smaller passage, or lower the token budget in Settings → AI providers.`;
}
