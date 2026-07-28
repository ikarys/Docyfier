/**
 * What makes guessing the one password impractical.
 *
 * Single-user and single-process, so a counter is enough: eight consecutive
 * failures and the instance stops answering for five minutes. Deliberately not
 * a table — there is no user to rate-limit per, and nothing here should have to
 * outlive a restart.
 */

/** Consecutive failures before the instance stops answering. */
export const MAX_ATTEMPTS = 8;

/** How long it stays locked once it does. */
export const LOCKOUT_MS = 5 * 60 * 1000;

export class LoginAttempts {
  private constructor(
    readonly failures: number,
    /** Instant the lockout ends; `0` when there is none. */
    readonly lockedUntil: number,
  ) {}

  static fresh(): LoginAttempts {
    return new LoginAttempts(0, 0);
  }

  /** The state as whatever stores it kept it. */
  static restore(failures: number, lockedUntil: number): LoginAttempts {
    return new LoginAttempts(Math.max(0, failures), Math.max(0, lockedUntil));
  }

  isLocked(now: number): boolean {
    return now < this.lockedUntil;
  }

  /**
   * One more wrong password. The failure that reaches the limit starts the
   * lockout and clears the counter, so the next wrong password after it costs
   * one attempt rather than another five minutes.
   */
  failed(now: number): LoginAttempts {
    const failures = this.failures + 1;
    return failures >= MAX_ATTEMPTS
      ? new LoginAttempts(0, now + LOCKOUT_MS)
      : new LoginAttempts(failures, this.lockedUntil);
  }

  succeeded(): LoginAttempts {
    return LoginAttempts.fresh();
  }
}

/** Where the counter lives between two attempts — the port, not a store. */
export interface AttemptLog {
  read(): LoginAttempts;
  write(attempts: LoginAttempts): void;
}
