import { describe, expect, it } from "vitest";
import { LOCKOUT_MS, LoginAttempts, MAX_ATTEMPTS } from "./login-attempts";

/**
 * What makes guessing the one password impractical. The rule is deliberately
 * cheap — a counter, not a table — so what it must not do is drift: a lockout
 * that forgets itself, or one that never ends.
 */

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

/** The state after `count` consecutive failures, all at the same instant. */
function afterFailures(count: number, now = NOW): LoginAttempts {
  let attempts = LoginAttempts.fresh();
  for (let i = 0; i < count; i++) attempts = attempts.failed(now);
  return attempts;
}

describe("LoginAttempts", () => {
  it("starts unlocked", () => {
    expect(LoginAttempts.fresh().isLocked(NOW)).toBe(false);
  });

  it("stays open while the failures are below the limit", () => {
    expect(afterFailures(MAX_ATTEMPTS - 1).isLocked(NOW)).toBe(false);
  });

  it("locks on the failure that reaches the limit", () => {
    expect(afterFailures(MAX_ATTEMPTS).isLocked(NOW)).toBe(true);
  });

  it("stays locked for the whole lockout", () => {
    const locked = afterFailures(MAX_ATTEMPTS);

    expect(locked.isLocked(NOW + LOCKOUT_MS - 1)).toBe(true);
    expect(locked.isLocked(NOW + LOCKOUT_MS)).toBe(false);
  });

  it("counts from zero again after a lockout, rather than locking on the next try", () => {
    const reopened = afterFailures(MAX_ATTEMPTS).failed(NOW + LOCKOUT_MS);

    expect(reopened.isLocked(NOW + LOCKOUT_MS)).toBe(false);
  });

  it("forgets the failures once a password is accepted", () => {
    const cleared = afterFailures(MAX_ATTEMPTS - 1).succeeded();

    expect(cleared.failed(NOW).isLocked(NOW)).toBe(false);
  });

  it("hands back a new state instead of mutating the old one", () => {
    const before = afterFailures(MAX_ATTEMPTS - 1);
    before.failed(NOW);

    expect(before.isLocked(NOW)).toBe(false);
  });

  it("survives a round trip through whatever stores it", () => {
    const locked = afterFailures(MAX_ATTEMPTS);
    const restored = LoginAttempts.restore(locked.failures, locked.lockedUntil);

    expect(restored.isLocked(NOW)).toBe(true);
    expect(restored.isLocked(NOW + LOCKOUT_MS)).toBe(false);
  });
});
