import { describe, expect, it } from "vitest";
import {
  exportFilename,
  optionValue,
  toTargetInfo,
  type ExportTarget,
} from "./types";

const target: ExportTarget = {
  id: "demo",
  label: "Demo",
  description: "A target used by the tests.",
  instructions: "Paste it somewhere.",
  mime: "text/plain",
  extension: "txt",
  options: [
    { id: "flavour", label: "Flavour", type: "select", default: "rich" },
    { id: "titleHeading", label: "Prepend the title", type: "toggle", default: "off" },
  ],
  render: () => "payload",
};

describe("exportFilename", () => {
  it("joins a slugged title to the target's extension", () => {
    expect(exportFilename("Rapport trimestriel", "md")).toBe(
      "Rapport-trimestriel.md",
    );
  });

  it("drops what a filesystem would choke on", () => {
    expect(exportFilename("Q3 / Q4: bilan", "txt")).toBe("Q3-Q4-bilan.txt");
  });

  it("strips accents rather than emitting a decomposed filename", () => {
    expect(exportFilename("Réunion", "txt")).toBe("Reunion.txt");
  });

  it("falls back to a name when the title leaves nothing usable", () => {
    expect(exportFilename("///", "docx")).toBe("document.docx");
    expect(exportFilename("", "docx")).toBe("document.docx");
  });

  it("caps the length, so no target hits a filesystem limit", () => {
    const name = exportFilename("a".repeat(200), "md");
    expect(name).toBe(`${"a".repeat(80)}.md`);
  });
});

describe("optionValue", () => {
  it("prefers what the user saved", () => {
    expect(optionValue(target, { flavour: "storage" }, "flavour")).toBe("storage");
  });

  it("falls back to the target's own default when nothing was saved", () => {
    expect(optionValue(target, {}, "flavour")).toBe("rich");
  });

  it("keeps an explicitly emptied value instead of restoring the default", () => {
    expect(optionValue(target, { flavour: "" }, "flavour")).toBe("");
  });

  it("returns an empty string for an option the target does not declare", () => {
    expect(optionValue(target, {}, "unknown")).toBe("");
  });
});

describe("toTargetInfo", () => {
  it("drops render, which must never reach the browser bundle", () => {
    expect(toTargetInfo(target)).not.toHaveProperty("render");
  });

  it("keeps the fields the settings and export pages render", () => {
    expect(toTargetInfo(target)).toEqual({
      id: "demo",
      label: "Demo",
      description: "A target used by the tests.",
      instructions: "Paste it somewhere.",
      extension: "txt",
      binary: false,
      options: target.options,
    });
  });

  it("gives the optional fields a concrete value the client can rely on", () => {
    const bare = toTargetInfo({ ...target, options: undefined, binary: undefined });
    expect(bare.options).toEqual([]);
    expect(bare.binary).toBe(false);
  });
});
