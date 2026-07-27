import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Single-user authentication (PLAN.md STEP 4). No orgs, no roles: one password
 * guards the instance.
 *
 * The password is stored as an scrypt hash with a per-instance random salt,
 * next to the settings file and never in the document store — a database the
 * user configures from inside the app cannot hold the credentials that protect
 * it. Sessions are stateless: an HMAC-signed expiry in an httpOnly cookie, so
 * no session table has to exist before STEP 6.
 */

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "docyfier_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const KEY_LENGTH = 64;
export const MIN_PASSWORD_LENGTH = 10;

/** Consecutive failures before the instance stops answering login attempts,
 * and how long it stays locked. Single-user, single-process: an in-memory
 * counter is enough to make guessing impractical. */
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 5 * 60 * 1000;

let failures = 0;
let lockedUntil = 0;

interface AuthFile {
  salt: string;
  hash: string;
  /** HMAC key for session cookies. Rotating it invalidates every session. */
  secret: string;
  updatedAt: string;
}

function authFile(): string {
  const dir =
    process.env.DOCYFIER_DATA_DIR ?? path.join(process.cwd(), "data", "documents");
  return path.join(path.dirname(dir), "auth.json");
}

async function readAuthFile(): Promise<AuthFile | null> {
  try {
    const raw = JSON.parse(await readFile(authFile(), "utf8")) as AuthFile;
    return raw.salt && raw.hash && raw.secret ? raw : null;
  } catch {
    return null;
  }
}

async function writeAuthFile(file: AuthFile): Promise<void> {
  const target = authFile();
  await mkdir(path.dirname(target), { recursive: true });
  // Owner-only: the file holds the password hash and the session key.
  await writeFile(target, JSON.stringify(file, null, 2), { encoding: "utf8", mode: 0o600 });
}

/** The password configured by the environment, if any. It wins over the file,
 * so a deployment can set credentials without a first-run step. */
function envPassword(): string | null {
  const value = process.env.DOCYFIER_AUTH_PASSWORD;
  return value && value.length > 0 ? value : null;
}

/** True once the instance has credentials — from the environment or from a
 * password chosen on first run. */
export async function isPasswordSet(): Promise<boolean> {
  return envPassword() !== null || (await readAuthFile()) !== null;
}

/**
 * Whether this instance asks for a password at all. Opt-in: a local run stays
 * open until credentials exist, so nobody has to invent a password to try the
 * app. `DOCYFIER_AUTH=0` forces it off even when an `auth.json` lingers, and
 * `DOCYFIER_AUTH=1` turns it on before any password is chosen, which sends the
 * first visitor through the setup form.
 */
export async function isAuthEnabled(): Promise<boolean> {
  const flag = process.env.DOCYFIER_AUTH;
  if (flag === "0") return false;
  if (flag === "1") return true;
  return isPasswordSet();
}

/** Whether the caller may act on this instance: either auth is off, or the
 * request carries a valid session. The check every API route needs. */
export async function isAuthorized(): Promise<boolean> {
  return (await hasSession()) || !(await isAuthEnabled());
}

async function sessionSecret(): Promise<Buffer> {
  const fromEnv = process.env.DOCYFIER_AUTH_SECRET;
  if (fromEnv) return Buffer.from(fromEnv, "utf8");

  const file = await readAuthFile();
  if (file) return Buffer.from(file.secret, "hex");

  // Password set by environment only: derive a stable key from it, so sessions
  // survive a restart without a file to write.
  const password = envPassword();
  if (password) return createHmac("sha256", "docyfier-session").update(password).digest();

  throw new Error("No credentials configured");
}

/** Store a new password. Rotating it also rotates the session key, so every
 * existing session dies with the old password. */
export async function setPassword(password: string): Promise<void> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  await writeAuthFile({
    salt: salt.toString("hex"),
    hash: hash.toString("hex"),
    secret: randomBytes(32).toString("hex"),
    updatedAt: new Date().toISOString(),
  });
  failures = 0;
  lockedUntil = 0;
}

function equal(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

export type LoginResult = "ok" | "invalid" | "locked" | "unconfigured";

/** Check a password attempt, applying the lockout. */
export async function verifyPassword(password: string): Promise<LoginResult> {
  if (Date.now() < lockedUntil) return "locked";

  const fromEnv = envPassword();
  const file = await readAuthFile();
  if (!fromEnv && !file) return "unconfigured";

  let ok = false;
  if (fromEnv) {
    ok = equal(Buffer.from(password, "utf8"), Buffer.from(fromEnv, "utf8"));
  } else if (file) {
    const attempt = await scrypt(password, Buffer.from(file.salt, "hex"), KEY_LENGTH);
    ok = equal(attempt, Buffer.from(file.hash, "hex"));
  }

  if (!ok) {
    failures += 1;
    if (failures >= MAX_ATTEMPTS) {
      lockedUntil = Date.now() + LOCKOUT_MS;
      failures = 0;
    }
    return "invalid";
  }
  failures = 0;
  return "ok";
}

async function sign(value: string): Promise<string> {
  const secret = await sessionSecret();
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Open a session for the current browser. */
export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = `${expiresAt}.${await sign(String(expiresAt))}`;
  const proto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Behind TLS the cookie must never travel in clear; on a plain-HTTP local
    // instance a `secure` cookie would simply never be sent back.
    secure: proto === "https",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Whether the request carries a valid, unexpired session. */
export async function hasSession(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry) || expiry < Date.now() || !signature) return false;
  try {
    return equal(
      Buffer.from(signature, "base64url"),
      Buffer.from(await sign(expiresAt), "base64url"),
    );
  } catch {
    return false;
  }
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
