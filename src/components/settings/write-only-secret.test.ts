import { describe, expect, it } from "vitest";
import { forgotten, noSecretTyped, offersToForget, typed } from "./write-only-secret";

describe("a secret the browser never receives", () => {
  it("starts empty, keeping whatever is stored", () => {
    expect(noSecretTyped()).toEqual({ value: "", cleared: false });
  });

  it("takes back a pending removal as soon as one is typed", () => {
    expect(typed(forgotten(noSecretTyped()), "hunter2").cleared).toBe(false);
  });

  it("keeps the removal while the field is empty", () => {
    expect(typed(forgotten(noSecretTyped()), "").cleared).toBe(true);
  });

  it("offers to forget one that is stored and untouched", () => {
    expect(offersToForget(noSecretTyped(), true)).toBe(true);
  });

  it("stops offering once it is being replaced or already removed", () => {
    expect(offersToForget(typed(noSecretTyped(), "new"), true)).toBe(false);
    expect(offersToForget(forgotten(noSecretTyped()), true)).toBe(false);
  });

  it("offers nothing when none was ever stored", () => {
    expect(offersToForget(noSecretTyped(), false)).toBe(false);
  });
});
