import { describe, expect, it } from "vitest";
import { SETTINGS_SCOPES, findScope } from "./settings-scopes";

/**
 * The scopes drive both the tab bar and the routes under `/settings`. A scope
 * whose href does not match its id is a tab that navigates to a 404.
 */
describe("SETTINGS_SCOPES", () => {
  it("gives every scope a route matching its id", () => {
    for (const scope of SETTINGS_SCOPES) {
      expect(scope.href).toBe(`/settings/${scope.id}`);
    }
  });

  it("has no duplicate id", () => {
    const ids = SETTINGS_SCOPES.map((scope) => scope.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every scope a label and a lede for the page header", () => {
    for (const scope of SETTINGS_SCOPES) {
      expect(scope.label.trim()).not.toBe("");
      expect(scope.lede.trim()).not.toBe("");
    }
  });
});

describe("findScope", () => {
  it("finds a scope by id", () => {
    expect(findScope("storage")).toMatchObject({ id: "storage", href: "/settings/storage" });
  });

  it("returns undefined for an unknown id, so the page can 404 rather than throw", () => {
    expect(findScope("nope")).toBeUndefined();
    expect(findScope("")).toBeUndefined();
  });
});
