import { describe, expect, it } from "vitest";
import { filterEmoji } from "./emoji-items";

describe("choosing an emoji by name", () => {
  it("offers a short list before anything is typed", () => {
    expect(filterEmoji("").length).toBe(12);
  });

  it("finds an emoji by its name", () => {
    expect(filterEmoji("rocket")[0]).toEqual({ character: "🚀", name: "rocket" });
  });

  it("puts what starts with the query before what merely contains it", () => {
    const names = filterEmoji("smile").map((choice) => choice.name);

    expect(names[0].startsWith("smile")).toBe(true);
  });

  it("ignores case and surrounding spaces", () => {
    expect(filterEmoji("  ROCKET ")[0].name).toBe("rocket");
  });

  it("hands back nothing for a name no emoji has", () => {
    expect(filterEmoji("zzzznotanemoji")).toEqual([]);
  });

  it("never offers more than the popup can show", () => {
    expect(filterEmoji("a").length).toBeLessThanOrEqual(12);
  });
});
