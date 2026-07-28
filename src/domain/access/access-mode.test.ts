import { describe, expect, it } from "vitest";
import { accessEnabled } from "./access-mode";

/**
 * Whether this instance asks for a password at all. Opt-in on purpose: nobody
 * has to invent a password to try the app locally. The two dangerous mistakes
 * are opposite — leaving a configured instance open, and locking an operator
 * out of a first run — so both directions are pinned.
 */
describe("accessEnabled", () => {
  it("is off on an instance with no credentials", () => {
    expect(accessEnabled(undefined, false)).toBe(false);
  });

  it("turns itself on once a password exists", () => {
    expect(accessEnabled(undefined, true)).toBe(true);
  });

  it('stays off when the deployment says "0", even with a password on disk', () => {
    expect(accessEnabled("0", true)).toBe(false);
  });

  it('turns on when the deployment says "1", before any password is chosen', () => {
    expect(accessEnabled("1", false)).toBe(true);
  });

  it("ignores a value that is neither, rather than guessing", () => {
    expect(accessEnabled("yes", false)).toBe(false);
    expect(accessEnabled("yes", true)).toBe(true);
    expect(accessEnabled("", true)).toBe(true);
  });
});
