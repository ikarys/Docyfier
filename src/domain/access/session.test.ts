import { describe, expect, it } from "vitest";
import { Session, SESSION_TTL_MS, type SessionSigner } from "./session";

/**
 * A session is an expiry the instance signed. Nothing else stands between a
 * cookie and the whole app, so every way of getting past this has to be a test:
 * an expiry moved forward, a signature copied from another instance, a token
 * with an extra field bolted on.
 */

const NOW = Date.UTC(2026, 6, 28, 12, 0, 0);

/** Signs by prefixing, so a wrong signature is obvious in a failure message. */
function signer(key = "k"): SessionSigner & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    sign(value) {
      asked.push(value);
      return `${key}-${value}`;
    },
    matches(value, signature) {
      asked.push(value);
      return signature === `${key}-${value}`;
    },
  };
}

describe("Session.issue", () => {
  it("expires one TTL after it was opened", () => {
    expect(Session.issue(NOW).expiresAt).toBe(NOW + SESSION_TTL_MS);
  });

  it("states its lifetime in the seconds a cookie is set with", () => {
    expect(Session.issue(NOW).ttlSeconds).toBe(SESSION_TTL_MS / 1000);
  });

  it("carries its expiry and its signature, in that order", () => {
    const session = Session.issue(NOW);

    expect(session.toCookieValue(signer())).toBe(
      `${NOW + SESSION_TTL_MS}.k-${NOW + SESSION_TTL_MS}`,
    );
  });
});

describe("Session.verify", () => {
  const valid = () => Session.issue(NOW).toCookieValue(signer());

  it("accepts a token this instance signed and has not outlived", () => {
    expect(Session.verify(valid(), NOW, signer())?.expiresAt).toBe(NOW + SESSION_TTL_MS);
  });

  it("refuses a missing cookie", () => {
    expect(Session.verify(undefined, NOW, signer())).toBeNull();
    expect(Session.verify(null, NOW, signer())).toBeNull();
    expect(Session.verify("", NOW, signer())).toBeNull();
  });

  it("refuses a token that is not an expiry and a signature", () => {
    expect(Session.verify("nosignature", NOW, signer())).toBeNull();
    expect(Session.verify(`${NOW}.`, NOW, signer())).toBeNull();
    expect(Session.verify(`.k-${NOW}`, NOW, signer())).toBeNull();
  });

  it("refuses a token carrying anything beyond those two fields", () => {
    const [expiry, signature] = valid().split(".");

    expect(Session.verify(`${expiry}.${signature}.extra`, NOW, signer())).toBeNull();
  });

  it("refuses an expiry that is not a number", () => {
    expect(Session.verify("later.k-later", NOW, signer())).toBeNull();
    expect(Session.verify("Infinity.k-Infinity", NOW, signer())).toBeNull();
  });

  it("refuses a session that has run out", () => {
    const token = valid();

    expect(Session.verify(token, NOW + SESSION_TTL_MS + 1, signer())).toBeNull();
  });

  it("refuses a signature this instance did not produce", () => {
    const elsewhere = Session.issue(NOW).toCookieValue(signer("other-instance"));

    expect(Session.verify(elsewhere, NOW, signer())).toBeNull();
  });

  it("refuses an expiry moved forward under the old signature", () => {
    const [, signature] = valid().split(".");
    const forged = `${NOW + SESSION_TTL_MS * 10}.${signature}`;

    expect(Session.verify(forged, NOW, signer())).toBeNull();
  });

  /** Expiry is arithmetic; verifying a signature is not. The cheap refusal
   * comes first so an expired cookie costs nothing to reject. */
  it("does not ask the signer about a token that already expired", () => {
    const token = valid();
    const asked = signer();

    Session.verify(token, NOW + SESSION_TTL_MS + 1, asked);

    expect(asked.asked).toEqual([]);
  });
});
