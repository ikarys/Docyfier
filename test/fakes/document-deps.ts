import type { DocumentDeps } from "@/application/documents/deps";
import type { Clock, IdGenerator } from "@/domain/shared/clock";
import { InMemoryDocumentRepository } from "@/infrastructure/documents/in-memory-repository";

/**
 * Use-case dependencies a test drives: an in-memory repository, a clock that
 * only moves when the test says so, and ids that are readable in an assertion.
 * Time and identity are inputs here, not ambient state — that is the whole
 * point of injecting them.
 */

export class FixedClock implements Clock {
  constructor(private current = "2026-01-01T10:00:00.000Z") {}

  now(): string {
    return this.current;
  }

  epochMs(): number {
    return Date.parse(this.current);
  }

  /** Move to an explicit instant, so a test can say what "later" means. */
  set(instant: string): void {
    this.current = instant;
  }
}

export class SequentialIds implements IdGenerator {
  private count = 0;

  next(): string {
    this.count += 1;
    return `doc-${this.count}`;
  }
}

export interface TestDeps extends DocumentDeps {
  repository: InMemoryDocumentRepository;
  clock: FixedClock;
  ids: SequentialIds;
}

export function testDeps(): TestDeps {
  return {
    repository: new InMemoryDocumentRepository(),
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
