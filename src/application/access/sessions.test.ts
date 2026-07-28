import { describe, expect, it } from "vitest";
import { SESSION_TTL_MS } from "@/domain/access/session";
import {
  accessFakes,
  digestOf,
  FakeEnvironment,
  type AccessFakes,
} from "../../../test/fakes/access-deps";
import { choosePassword } from "./authenticate";
import { openSession, sessionIsValid } from "./sessions";

/**
 * Opening a session and reading one back. What matters here is *which key* signs
 * it: an instance has up to three sources for one, and picking the wrong one
 * either logs everybody out or honours a cookie from somewhere else.
 */

const GOOD = "un-mot-de-passe-correct";
const AT = Date.UTC(2026, 6, 28, 12, 0, 0);

function withStored(sessionKey = "stored-key"): AccessFakes {
  return accessFakes({
    at: AT,
    stored: { ...digestOf(GOOD), sessionKey, updatedAt: "2026-01-01" },
  });
}

describe("openSession", () => {
  it("hands back a cookie value and the lifetime to set it with", async () => {
    const session = await openSession(withStored());

    expect(session.ttlSeconds).toBe(SESSION_TTL_MS / 1000);
    expect(session.cookieValue).toBe(`${AT + SESSION_TTL_MS}.stored:stored-key/${AT + SESSION_TTL_MS}`);
  });

  it("refuses to open one on an instance with no credentials at all", async () => {
    await expect(openSession(accessFakes())).rejects.toThrow(/no credentials/i);
  });
});

describe("sessionIsValid", () => {
  it("accepts the cookie it just wrote", async () => {
    const deps = withStored();
    const { cookieValue } = await openSession(deps);

    expect(await sessionIsValid(deps, cookieValue)).toBe(true);
  });

  it("refuses a missing cookie", async () => {
    expect(await sessionIsValid(withStored(), undefined)).toBe(false);
  });

  it("refuses one signed with another instance's key", async () => {
    const { cookieValue } = await openSession(withStored("their-key"));

    expect(await sessionIsValid(withStored("our-key"), cookieValue)).toBe(false);
  });

  it("refuses one that has outlived its expiry", async () => {
    const deps = withStored();
    const { cookieValue } = await openSession(deps);

    deps.clock.advanceBy(SESSION_TTL_MS + 1);

    expect(await sessionIsValid(deps, cookieValue)).toBe(false);
  });

  /** The rotation promise from `choosePassword`, seen from the cookie's side. */
  it("stops honouring the sessions a rotated password had authorised", async () => {
    const deps = withStored();
    const { cookieValue } = await openSession(deps);
    expect(await sessionIsValid(deps, cookieValue)).toBe(true);

    await choosePassword(deps, GOOD);

    expect(await sessionIsValid(deps, cookieValue)).toBe(false);
  });

  it("refuses everything on an instance with no credentials, rather than throwing", async () => {
    const { cookieValue } = await openSession(withStored());

    expect(await sessionIsValid(accessFakes(), cookieValue)).toBe(false);
  });
});

/**
 * Three sources, one order. The deployment's key wins so an operator can force
 * every session to be re-established; the stored key comes next; and an instance
 * whose password comes from the environment alone has no file to keep a key in,
 * so it derives a stable one — otherwise every restart would log everybody out.
 */
describe("the key a session is signed with", () => {
  const signedWith = async (deps: AccessFakes) => (await openSession(deps)).cookieValue;

  it("is the deployment's, when it names one", async () => {
    const deps = accessFakes({
      at: AT,
      stored: { ...digestOf(GOOD), sessionKey: "stored-key", updatedAt: "x" },
      environment: new FakeEnvironment({ sessionKey: "deployed-key" }),
    });

    expect(await signedWith(deps)).toContain("deployed:deployed-key");
  });

  it("is the stored one, when the deployment names none", async () => {
    expect(await signedWith(withStored("stored-key"))).toContain("stored:stored-key");
  });

  it("is derived from the deployment's password when there is no file", async () => {
    const deps = accessFakes({
      at: AT,
      environment: new FakeEnvironment({ password: GOOD }),
    });

    expect(await signedWith(deps)).toContain(`derived:${GOOD}`);
  });

  it("survives a restart in that last case, since nothing was written down", async () => {
    const environment = new FakeEnvironment({ password: GOOD });
    const before = accessFakes({ at: AT, environment });
    const cookieValue = await signedWith(before);

    const afterRestart = accessFakes({ at: AT, environment });

    expect(await sessionIsValid(afterRestart, cookieValue)).toBe(true);
  });
});
