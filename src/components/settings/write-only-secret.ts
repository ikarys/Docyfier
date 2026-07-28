/**
 * A stored credential the browser is never given: a database password, an LLM
 * API key.
 *
 * Because the field starts empty even when a secret exists, "empty" cannot mean
 * "no secret" — it means "keep the one on the server". Erasing therefore has to
 * be said out loud, and typing a replacement takes that back. Every settings
 * form obeys the same rule, so it is written once here.
 */
export interface WriteOnlySecret {
  value: string;
  /** The user asked for the stored secret to be erased on save. */
  cleared: boolean;
}

export function noSecretTyped(): WriteOnlySecret {
  return { value: "", cleared: false };
}

export function typed(secret: WriteOnlySecret, value: string): WriteOnlySecret {
  return { value, cleared: value ? false : secret.cleared };
}

export function forgotten(secret: WriteOnlySecret): WriteOnlySecret {
  return { ...secret, cleared: true };
}

/** Erasing is only offered while nothing else would replace what is stored. */
export function offersToForget(secret: WriteOnlySecret, stored: boolean): boolean {
  return stored && !secret.cleared && !secret.value;
}
