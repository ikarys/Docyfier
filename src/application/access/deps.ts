import type {
  AccessEnvironment,
  CredentialsRepository,
  SessionKeyGenerator,
  SessionSigning,
} from "@/domain/access/credentials";
import type { AttemptLog } from "@/domain/access/login-attempts";
import type { PasswordHasher } from "@/domain/access/password";
import type { Clock } from "@/domain/shared/clock";

/** What the access use cases are handed. Nothing here reaches for `process.env`,
 * the filesystem, `node:crypto` or the clock on its own. */
export interface AccessDeps {
  credentials: CredentialsRepository;
  hasher: PasswordHasher;
  signing: SessionSigning;
  keys: SessionKeyGenerator;
  attempts: AttemptLog;
  clock: Clock;
  environment: AccessEnvironment;
}
