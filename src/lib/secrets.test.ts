import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearSecretKeyCache,
  decryptSecret,
  encryptSecret,
  isEncrypted,
} from "./secrets";

const KEY = "a".repeat(64);
const OTHER_KEY = "b".repeat(64);

/**
 * Every test pins a key through the environment: without one the module
 * generates a key file, and these tests must not touch the data volume.
 */
function useKey(hex: string): void {
  process.env.DOCYFIER_SECRET_KEY = hex;
  clearSecretKeyCache();
}

beforeEach(() => useKey(KEY));

afterEach(() => {
  delete process.env.DOCYFIER_SECRET_KEY;
  clearSecretKeyCache();
});

describe("isEncrypted", () => {
  it("recognizes a value this module wrote", async () => {
    expect(isEncrypted(await encryptSecret("sk-live-123"))).toBe(true);
  });

  it("does not claim a clear value, however it looks", () => {
    expect(isEncrypted("sk-live-123")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted("v2.a.b.c")).toBe(false);
  });
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a secret", async () => {
    const stored = await encryptSecret("sk-live-123");
    expect(stored).not.toContain("sk-live-123");
    expect(await decryptSecret(stored)).toBe("sk-live-123");
  });

  it("round-trips non-ASCII, which a passphrase may well hold", async () => {
    expect(await decryptSecret(await encryptSecret("clé-à-café 🔐"))).toBe(
      "clé-à-café 🔐",
    );
  });

  it("leaves an empty secret empty: there is nothing to hide", async () => {
    expect(await encryptSecret("")).toBe("");
    expect(await decryptSecret("")).toBe("");
  });

  it("produces a different ciphertext every time, so equal keys are not visible", async () => {
    const [a, b] = await Promise.all([
      encryptSecret("same"),
      encryptSecret("same"),
    ]);
    expect(a).not.toBe(b);
    expect(await decryptSecret(a)).toBe(await decryptSecret(b));
  });

  it("returns a pre-encryption value untouched, so an upgrade keeps working", async () => {
    expect(await decryptSecret("sk-written-before-this-module")).toBe(
      "sk-written-before-this-module",
    );
  });

  it("refuses a tampered payload rather than returning garbage", async () => {
    const [prefix, iv, tag, data] = (await encryptSecret("sk-live-123")).split(".");
    const flipped = data.startsWith("A") ? `B${data.slice(1)}` : `A${data.slice(1)}`;
    await expect(decryptSecret([prefix, iv, tag, flipped].join("."))).rejects.toThrow(
      /cannot be decrypted/,
    );
  });

  it("fails loudly when the key rotated, instead of silently sending no key", async () => {
    const stored = await encryptSecret("sk-live-123");
    useKey(OTHER_KEY);
    await expect(decryptSecret(stored)).rejects.toThrow(/cannot be decrypted/);
  });

  it("rejects a key that is not 32 bytes", async () => {
    useKey("tooshort");
    await expect(encryptSecret("x")).rejects.toThrow(/must be 32 bytes/);
  });

  it("accepts a base64 key as well as a hex one", async () => {
    useKey(Buffer.alloc(32, 7).toString("base64"));
    expect(await decryptSecret(await encryptSecret("ok"))).toBe("ok");
  });
});
