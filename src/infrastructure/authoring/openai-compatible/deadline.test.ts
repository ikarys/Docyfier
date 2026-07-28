import { afterEach, describe, expect, it } from "vitest";
import { callTimeoutMs, isTimeout, timeoutMessage } from "./deadline";

const ENV = "DOCYFIER_LLM_TIMEOUT_MS";

describe("the call deadline", () => {
  afterEach(() => {
    delete process.env[ENV];
  });

  it("falls back to the default when the override is absent", () => {
    expect(callTimeoutMs()).toBe(90_000);
  });

  it("takes a positive whole number of milliseconds from the environment", () => {
    process.env[ENV] = "5000";
    expect(callTimeoutMs()).toBe(5_000);
  });

  it.each(["0", "-1", "1.5", "soon", ""])("ignores %o as a deadline", (value) => {
    process.env[ENV] = value;
    expect(callTimeoutMs()).toBe(90_000);
  });

  it("says how long it waited, in seconds", () => {
    process.env[ENV] = "30000";
    expect(timeoutMessage()).toContain("30s");
  });
});

describe("recognising our own deadline", () => {
  it("reads a timeout the SDK wrapped in its own error", () => {
    const wrapped = new Error("call failed", {
      cause: new Error("inner", { cause: { name: "TimeoutError" } }),
    });
    expect(isTimeout(wrapped)).toBe(true);
  });

  it("reads an abort as a deadline too", () => {
    expect(isTimeout({ name: "AbortError" })).toBe(true);
  });

  it("leaves a refused connection alone", () => {
    expect(isTimeout(new TypeError("fetch failed"))).toBe(false);
  });

  it("gives up rather than walking a cause cycle forever", () => {
    const looping: { name: string; cause?: unknown } = { name: "Error" };
    looping.cause = looping;
    expect(isTimeout(looping)).toBe(false);
  });
});
