import { describe, expect, it } from "vitest";
import { hmacSessionSigning } from "./hmac-session-signing";

/**
 * The real signer. Any of these failing means a forged cookie is accepted, so
 * they are stated over the adapter itself rather than only over the fake.
 */
describe("hmacSessionSigning", () => {
  const value = "1790000000000";

  it("recognises its own signature", () => {
    const signer = hmacSessionSigning.fromStoredKey("a".repeat(64));

    expect(signer.matches(value, signer.sign(value))).toBe(true);
  });

  it("refuses a signature for another value", () => {
    const signer = hmacSessionSigning.fromStoredKey("a".repeat(64));

    expect(signer.matches("1790000000001", signer.sign(value))).toBe(false);
  });

  it("refuses a signature from another key", () => {
    const ours = hmacSessionSigning.fromStoredKey("a".repeat(64));
    const theirs = hmacSessionSigning.fromStoredKey("b".repeat(64));

    expect(ours.matches(value, theirs.sign(value))).toBe(false);
  });

  it("refuses a signature of the wrong length instead of throwing", () => {
    const signer = hmacSessionSigning.fromStoredKey("a".repeat(64));

    expect(signer.matches(value, "")).toBe(false);
    expect(signer.matches(value, "short")).toBe(false);
    expect(signer.matches(value, signer.sign(value).slice(0, 10))).toBe(false);
  });

  it("keeps the signature URL-safe, since it travels in a cookie", () => {
    const signature = hmacSessionSigning.fromStoredKey("a".repeat(64)).sign(value);

    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  /** The three key sources are three different keys. Two of them agreeing would
   * mean a cookie signed under one is honoured under another. */
  it("gives each key source its own signature", () => {
    const key = "a".repeat(64);
    const deployed = hmacSessionSigning.fromDeployedKey(key).sign(value);
    const stored = hmacSessionSigning.fromStoredKey(key).sign(value);
    const derived = hmacSessionSigning.fromPassword(key).sign(value);

    expect(new Set([deployed, stored, derived]).size).toBe(3);
  });

  it("derives the same key from the same password, so a restart keeps sessions", () => {
    const first = hmacSessionSigning.fromPassword("un-mot-de-passe-correct");
    const second = hmacSessionSigning.fromPassword("un-mot-de-passe-correct");

    expect(second.matches(value, first.sign(value))).toBe(true);
  });

  it("derives a different key from a different password", () => {
    const first = hmacSessionSigning.fromPassword("un-mot-de-passe-correct");
    const second = hmacSessionSigning.fromPassword("un-autre-mot-de-passe");

    expect(second.matches(value, first.sign(value))).toBe(false);
  });

  it("takes a deployed key as the text it was set to, not as hex", () => {
    // A key like "not-hex-at-all" must key the HMAC with those bytes; reading it
    // as hex would silently collapse it to almost nothing.
    const signer = hmacSessionSigning.fromDeployedKey("not-hex-at-all");
    const other = hmacSessionSigning.fromDeployedKey("not-hex-at-al1");

    expect(signer.matches(value, signer.sign(value))).toBe(true);
    expect(other.matches(value, signer.sign(value))).toBe(false);
  });
});
