import { describe, expect, it } from "vitest";
import { scryptHasher } from "./scrypt-hasher";

/** The real crypto: what the domain tests replace with a fake has to hold here
 * for the fake to have proved anything. */
describe("scryptHasher", () => {
  const password = "un-mot-de-passe-correct";

  it("accepts the password it hashed", async () => {
    const digest = await scryptHasher.digest(password);

    expect(await scryptHasher.matches(password, digest)).toBe(true);
  });

  it("refuses any other password", async () => {
    const digest = await scryptHasher.digest(password);

    expect(await scryptHasher.matches(`${password}!`, digest)).toBe(false);
    expect(await scryptHasher.matches("", digest)).toBe(false);
  });

  it("salts every password, so the same one never hashes the same twice", async () => {
    const first = await scryptHasher.digest(password);
    const second = await scryptHasher.digest(password);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(await scryptHasher.matches(password, second)).toBe(true);
  });

  it("never puts the password in what it stores", async () => {
    const digest = await scryptHasher.digest(password);

    expect(JSON.stringify(digest)).not.toContain(password);
  });

  it("refuses rather than throwing on a corrupt digest", async () => {
    expect(await scryptHasher.matches(password, { salt: "zz", hash: "zz" })).toBe(false);
    expect(await scryptHasher.matches(password, { salt: "", hash: "" })).toBe(false);
  });

  it("compares two secrets on equality, whatever their length", () => {
    expect(scryptHasher.secretsMatch("abc", "abc")).toBe(true);
    expect(scryptHasher.secretsMatch("abc", "abd")).toBe(false);
    // A length mismatch must be a refusal, not the throw `timingSafeEqual` does.
    expect(scryptHasher.secretsMatch("abc", "abcd")).toBe(false);
    expect(scryptHasher.secretsMatch("", "")).toBe(true);
  });
});
