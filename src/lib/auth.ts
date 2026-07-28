import "server-only";
import path from "node:path";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AccessDeps } from "@/application/access/deps";
import {
  accessRequired,
  checkPassword,
  choosePassword,
  credentialsExist,
  type LoginResult,
} from "@/application/access/authenticate";
import { openSession, sessionIsValid } from "@/application/access/sessions";
import { MIN_PASSWORD_LENGTH } from "@/domain/access/password";
import { processEnvironment } from "@/infrastructure/access/environment";
import { FileCredentialsRepository } from "@/infrastructure/access/file-credentials-repository";
import { hmacSessionSigning } from "@/infrastructure/access/hmac-session-signing";
import { processAttemptLog } from "@/infrastructure/access/process-attempt-log";
import { randomSessionKeys } from "@/infrastructure/access/random-session-keys";
import { scryptHasher } from "@/infrastructure/access/scrypt-hasher";
import { systemClock } from "@/infrastructure/shared/system-clock";

/**
 * Composition root for single-user authentication (PLAN.md STEP 4). No orgs, no
 * roles: one password guards the instance.
 *
 * Everything a framework owns stays here — the cookie, the forwarded protocol,
 * the redirect. Whether a password is the one, and whether a cookie stands for a
 * session, is decided in `application/access/` against ports.
 */

export const SESSION_COOKIE = "docyfier_session";
export { MIN_PASSWORD_LENGTH };
export type { LoginResult };

function documentsDir(): string {
  return process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
}

function deps(): AccessDeps {
  return {
    credentials: FileCredentialsRepository.beside(documentsDir()),
    hasher: scryptHasher,
    signing: hmacSessionSigning,
    keys: randomSessionKeys,
    attempts: processAttemptLog,
    clock: systemClock,
    environment: processEnvironment,
  };
}

/** True once the instance has credentials — from the environment or from a
 * password chosen on first run. */
export function isPasswordSet(): Promise<boolean> {
  return credentialsExist(deps());
}

/** Whether this instance asks for a password at all. */
export function isAuthEnabled(): Promise<boolean> {
  return accessRequired(deps());
}

/** Store a new password. Rotating it also rotates the session key, so every
 * existing session dies with the old password. */
export function setPassword(password: string): Promise<void> {
  return choosePassword(deps(), password);
}

/** Check a password attempt, applying the lockout. */
export function verifyPassword(password: string): Promise<LoginResult> {
  return checkPassword(deps(), password);
}

/** Open a session for the current browser. */
export async function startSession(): Promise<void> {
  const { cookieValue, ttlSeconds } = await openSession(deps());
  const proto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    // Behind TLS the cookie must never travel in clear; on a plain-HTTP local
    // instance a `secure` cookie would simply never be sent back.
    secure: proto === "https",
    path: "/",
    maxAge: ttlSeconds,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Whether the request carries a valid, unexpired session. */
export async function hasSession(): Promise<boolean> {
  return sessionIsValid(deps(), (await cookies()).get(SESSION_COOKIE)?.value);
}

/** Whether the caller may act on this instance: either auth is off, or the
 * request carries a valid session. The check every API route needs. */
export async function isAuthorized(): Promise<boolean> {
  return (await hasSession()) || !(await isAuthEnabled());
}

/**
 * Guard for every authenticated entry point — pages, server actions and API
 * routes. Redirects to the login page (or to first-run setup) instead of
 * returning, so a caller cannot forget to handle the false case.
 */
export async function requireAuth(): Promise<void> {
  if (await isAuthorized()) return;
  redirect("/login");
}
