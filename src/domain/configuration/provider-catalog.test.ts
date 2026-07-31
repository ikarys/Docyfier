import { describe, expect, it } from "vitest";
import { AiProvider } from "./ai-provider";
import { LastProviderStays, ProviderCatalog, UnknownProvider } from "./provider-catalog";

const record = (id: string, port: number) => ({
  id,
  label: "",
  baseUrl: `http://localhost:${port}/v1`,
  model: "",
  apiKey: "",
  maxOutputTokens: 4096,
});

const provider = (id: string, port: number) => AiProvider.create(record(id, port));

const catalogOf = (...ids: string[]) =>
  ProviderCatalog.of(
    ids.map((id, i) => provider(id, 1000 + i)),
    ids[0],
  );

/**
 * The catalog is what the switcher and the settings page both read. Its rules
 * exist so no combination of clicks can leave the app without an endpoint to
 * call: something is always active, and the last provider cannot be deleted.
 */
describe("ProviderCatalog", () => {
  it("answers with the active provider", () => {
    const catalog = catalogOf("a", "b").activate("b");
    expect(catalog.active.id).toBe("b");
  });

  it("falls back to the first provider when the stored active one is gone", () => {
    const catalog = ProviderCatalog.of([provider("a", 1000)], "deleted-long-ago");
    expect(catalog.active.id).toBe("a");
  });

  it("refuses to activate a provider it does not hold", () => {
    expect(() => catalogOf("a", "b").activate("c")).toThrow(UnknownProvider);
  });

  it("replaces a provider in place, keeping the order the user set", () => {
    const catalog = catalogOf("a", "b", "c").save(
      AiProvider.create({ ...record("b", 9999), label: "Renamed" }),
    );
    expect(catalog.list.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(catalog.list[1].label).toBe("Renamed");
  });

  it("appends a provider it has never seen", () => {
    const catalog = catalogOf("a").save(provider("new", 2000));
    expect(catalog.list.map((p) => p.id)).toEqual(["a", "new"]);
    expect(catalog.active.id).toBe("a");
  });

  it("removes a provider and moves the active mark off it", () => {
    const catalog = catalogOf("a", "b").activate("b").remove("b");
    expect(catalog.list.map((p) => p.id)).toEqual(["a"]);
    expect(catalog.active.id).toBe("a");
  });

  it("keeps the last provider: the app always needs an endpoint", () => {
    expect(() => catalogOf("a").remove("a")).toThrow(LastProviderStays);
  });

  it("ignores the removal of an id it never held", () => {
    const catalog = catalogOf("a", "b").remove("ghost");
    expect(catalog.list.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("hands out summaries, never keys", () => {
    const catalog = ProviderCatalog.of(
      [AiProvider.create({ ...record("a", 1000), apiKey: "sk-secret" })],
      "a",
    );
    expect(JSON.stringify(catalog.summaries)).not.toContain("sk-secret");
  });
});
