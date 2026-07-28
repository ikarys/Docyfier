import { describe, expect, it } from "vitest";
import { exportFilename } from "./export-filename";

describe("exportFilename", () => {
  it("joins a slugged title to the target's extension", () => {
    expect(exportFilename("Rapport trimestriel", "md")).toBe("Rapport-trimestriel.md");
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
