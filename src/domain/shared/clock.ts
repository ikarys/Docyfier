/**
 * The two things the domain cannot compute for itself: what time it is and
 * what the next id is. Both are injected, so a use case is a pure function of
 * its inputs and a test never has to freeze a global.
 */

export interface Clock {
  /** The current instant, ISO-8601 — the form every timestamp is stored in. */
  now(): string;
  /** The same instant as a number, for the arithmetic a session expiry needs. */
  epochMs(): number;
}

export interface IdGenerator {
  /** A new document id. Never reused, and safe as a path segment. */
  next(): string;
}
