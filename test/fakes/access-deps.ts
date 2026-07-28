import type { AccessDeps } from "@/application/access/deps";
import { LoginAttempts, type AttemptLog } from "@/domain/access/login-attempts";
import type {
  AccessEnvironment,
  CredentialsRepository,
  SessionKeyGenerator,
  SessionSigning,
  StoredCredentials,
} from "@/domain/access/credentials";
import type { PasswordDigest, PasswordHasher } from "@/domain/access/password";
import type { SessionSigner } from "@/domain/access/session";
import type { Clock } from "@/domain/shared/clock";

/**
 * Fakes for the access use cases. Every one of them is a real implementation of
 * its port — no mock framework — so a test that passes here says the port is a
 * real abstraction and not a shape the adapter happened to have.
 */

export class InMemoryCredentials implements CredentialsRepository {
  constructor(private stored: StoredCredentials | null = null) {}

  async load(): Promise<StoredCredentials | null> {
    return this.stored;
  }

  async save(credentials: StoredCredentials): Promise<void> {
    this.stored = credentials;
  }

  get current(): StoredCredentials | null {
    return this.stored;
  }
}

/** Hashes by reversing, which is enough to tell "the right password" from any
 * other and keeps a failure message readable. */
export const reversingHasher: PasswordHasher = {
  async digest(password) {
    return { salt: "salt", hash: [...password].reverse().join("") };
  },
  async matches(password, digest) {
    return [...password].reverse().join("") === digest.hash;
  },
  secretsMatch(a, b) {
    return a === b;
  },
};

export function digestOf(password: string): PasswordDigest {
  return { salt: "salt", hash: [...password].reverse().join("") };
}

/** Signs by prefixing with whatever key it was built from, so a test can see
 * which of the three key sources was used. */
export const prefixSigning: SessionSigning = {
  fromDeployedKey: (key) => keyedSigner(`deployed:${key}`),
  fromStoredKey: (sessionKey) => keyedSigner(`stored:${sessionKey}`),
  fromPassword: (password) => keyedSigner(`derived:${password}`),
};

function keyedSigner(key: string): SessionSigner {
  return {
    sign: (value) => `${key}/${value}`,
    matches: (value, signature) => signature === `${key}/${value}`,
  };
}

export class CountingKeys implements SessionKeyGenerator {
  private issued = 0;

  next(): string {
    this.issued += 1;
    return `generated-${this.issued}`;
  }
}

export class MemoryAttemptLog implements AttemptLog {
  private attempts = LoginAttempts.fresh();

  read(): LoginAttempts {
    return this.attempts;
  }

  write(attempts: LoginAttempts): void {
    this.attempts = attempts;
  }
}

export class StoppedClock implements Clock {
  constructor(private at: number) {}

  now(): string {
    return new Date(this.at).toISOString();
  }

  epochMs(): number {
    return this.at;
  }

  advanceBy(ms: number): void {
    this.at += ms;
  }
}

export class FakeEnvironment implements AccessEnvironment {
  constructor(
    private readonly values: {
      password?: string | null;
      sessionKey?: string | null;
      accessFlag?: string;
    } = {},
  ) {}

  password(): string | null {
    return this.values.password ?? null;
  }

  sessionKey(): string | null {
    return this.values.sessionKey ?? null;
  }

  accessFlag(): string | undefined {
    return this.values.accessFlag;
  }
}

export interface AccessFakes extends AccessDeps {
  credentials: InMemoryCredentials;
  attempts: MemoryAttemptLog;
  clock: StoppedClock;
}

export function accessFakes(
  overrides: Partial<AccessDeps> & {
    stored?: StoredCredentials | null;
    environment?: AccessEnvironment;
    at?: number;
  } = {},
): AccessFakes {
  return {
    credentials: new InMemoryCredentials(overrides.stored ?? null),
    hasher: reversingHasher,
    signing: prefixSigning,
    keys: new CountingKeys(),
    attempts: new MemoryAttemptLog(),
    clock: new StoppedClock(overrides.at ?? Date.UTC(2026, 6, 28, 12, 0, 0)),
    environment: overrides.environment ?? new FakeEnvironment(),
    ...overrides,
  } as AccessFakes;
}
