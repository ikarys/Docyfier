import { describe, expect, it } from "vitest";
import { dependencies } from "../../../../package.json";
import notices from "./notices.json";

/**
 * The notices file is generated, so what a test can still catch is the day it
 * stops matching the tree: a dependency added and the generator never run means
 * shipping someone's code without the notice their licence asks for.
 */
describe("third-party notices", () => {
  it("lists every package the app declares", () => {
    const listed = new Set(notices.map((notice) => notice.name));
    for (const name of Object.keys(dependencies)) {
      expect(listed, `${name} is missing — run \`npm run notices\``).toContain(name);
    }
  });

  it("names a licence for every package it lists", () => {
    for (const notice of notices) {
      expect(notice.license, notice.name).not.toBe("");
      expect(notice.license, notice.name).not.toBe("UNKNOWN");
      expect(notice.version, notice.name).not.toBe("");
    }
  });

  it("carries the licence text of the packages that ship one", () => {
    const withText = notices.filter((notice) => notice.text !== "");
    expect(withText.length).toBeGreaterThan(notices.length / 2);
    expect(notices.find((n) => n.name === "@xyflow/react")?.text).toContain("MIT License");
  });
});
