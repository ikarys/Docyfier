import { randomUUID } from "node:crypto";
import type { Clock, IdGenerator } from "@/domain/shared/clock";

/** The real clock and the real id source, for everything that is not a test. */

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};

export const uuidIds: IdGenerator = {
  // Hyphenated hex only, which is what the file-backed adapter accepts as a
  // path segment — see `isSafeId` in fs-repository.ts.
  next: () => randomUUID(),
};
