import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Brand } from "@/domain/documents/brand";
import { FileBrandRepository } from "./file-brand-repository";

/**
 * The brand adapter against a real settings file. Each run gets its own
 * temporary directory; nothing touches the data volume.
 */

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "docyfier-brand-"));
  process.env.DOCYFIER_DATA_DIR = path.join(dir, "documents");
});

afterEach(async () => {
  delete process.env.DOCYFIER_DATA_DIR;
  await rm(dir, { recursive: true, force: true });
});

async function writeSettings(sections: unknown): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "settings.json"), JSON.stringify(sections), "utf8");
}

describe("FileBrandRepository", () => {
  it("reads an empty brand when nothing was ever configured", async () => {
    const brand = await new FileBrandRepository().load();
    expect(brand.defaultTheme).toBeNull();
    expect(brand.presets).toEqual([]);
  });

  it("stores a brand and reads it back", async () => {
    const repository = new FileBrandRepository();
    const saved = Brand.empty()
      .withDefaultTheme({ preset: "minimal", overrides: { accent: "#008060" } })
      .savePreset({
        label: "Acme 2026",
        base: "vivid",
        tokens: { accent: "#008060", fontPair: "serif", radius: "sharp", density: "compact" },
      });

    await repository.save(saved);

    expect((await repository.load()).toRecord()).toEqual(saved.toRecord());
  });

  it("leaves the other scopes alone when it writes", async () => {
    await writeSettings({ storage: { driver: "postgres" } });

    await new FileBrandRepository().save(Brand.empty().withDefaultTheme("vivid"));

    const settings = JSON.parse(await readFile(path.join(dir, "settings.json"), "utf8"));
    expect(settings.storage).toEqual({ driver: "postgres" });
    expect(settings.brand.defaultTheme).toEqual({ preset: "vivid" });
  });

  it("survives a section edited by hand into nonsense", async () => {
    await writeSettings({ brand: { presets: "not a list", defaultTheme: 7 } });

    const brand = await new FileBrandRepository().load();

    expect(brand.presets).toEqual([]);
    expect(brand.defaultTheme).toEqual({ preset: "editorial" });
  });
});
