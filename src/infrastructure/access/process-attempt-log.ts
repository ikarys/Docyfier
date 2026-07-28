import { LoginAttempts, type AttemptLog } from "@/domain/access/login-attempts";

/**
 * The failed-attempt counter, for the lifetime of the process.
 *
 * Single-user and single-process, so this is the whole store: nothing here needs
 * to outlive a restart, and a restart costs an attacker the restart. The state is
 * module-level because it *is* the storage — the composition root injects this
 * adapter like any other, and a test uses an in-memory one instead.
 */

let attempts = LoginAttempts.fresh();

export const processAttemptLog: AttemptLog = {
  read: () => attempts,
  write: (next) => {
    attempts = next;
  },
};
