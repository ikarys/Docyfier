import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, requireUsablePassword, WeakPassword } from "./password";

/**
 * The one rule about the password itself. It lives here rather than in the
 * login form because the form is not the only way in: an operator calling the
 * use case directly must not be able to set a password the form would refuse.
 */
describe("requireUsablePassword", () => {
  it("accepts a password at the minimum length", () => {
    expect(() => requireUsablePassword("a".repeat(MIN_PASSWORD_LENGTH))).not.toThrow();
  });

  it("refuses anything shorter", () => {
    expect(() => requireUsablePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).toThrow(
      WeakPassword,
    );
    expect(() => requireUsablePassword("")).toThrow(WeakPassword);
  });

  it("counts what the user typed, without trimming it away", () => {
    // Whitespace is a character like any other; silently trimming would store a
    // password the user cannot type back.
    expect(() => requireUsablePassword(`${" ".repeat(MIN_PASSWORD_LENGTH)}`)).not.toThrow();
  });

  it("says what the minimum is, and nothing about the attempt", () => {
    try {
      requireUsablePassword("short");
      expect.unreachable();
    } catch (err) {
      expect((err as WeakPassword).minimum).toBe(MIN_PASSWORD_LENGTH);
      expect((err as WeakPassword).message).not.toContain("short");
    }
  });
});
