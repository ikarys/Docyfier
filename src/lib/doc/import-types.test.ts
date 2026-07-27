import { describe, expect, it } from "vitest";
import {
  IMPORT_EXTENSIONS,
  MAX_IMPORT_BYTES,
  importExtensionOf,
  titleFromFilename,
} from "./import-types";

describe("importExtensionOf", () => {
  it("recognizes every extension the picker offers", () => {
    for (const ext of IMPORT_EXTENSIONS) {
      expect(importExtensionOf(`notes${ext}`)).toBe(ext);
    }
  });

  it("ignores the case the operating system happened to use", () => {
    expect(importExtensionOf("NOTES.MD")).toBe(".md");
    expect(importExtensionOf("Rapport.DOCX")).toBe(".docx");
  });

  it("does not mistake .markdown for .md", () => {
    expect(importExtensionOf("notes.markdown")).toBe(".markdown");
  });

  it("refuses a format that carries layout rather than structure", () => {
    expect(importExtensionOf("rapport.pdf")).toBeNull();
    expect(importExtensionOf("feuille.xlsx")).toBeNull();
    expect(importExtensionOf("sans-extension")).toBeNull();
  });
});

describe("titleFromFilename", () => {
  it("drops the extension", () => {
    expect(titleFromFilename("Rapport annuel.md")).toBe("Rapport annuel");
  });

  it("reads separators as the spaces they stand in for", () => {
    expect(titleFromFilename("rapport_annuel-2026.docx")).toBe("rapport annuel 2026");
  });

  it("leaves a dot inside the name alone", () => {
    expect(titleFromFilename("v1.2 notes.txt")).toBe("v1.2 notes");
  });

  it("caps the length the store accepts for a title", () => {
    expect(titleFromFilename(`${"a".repeat(300)}.md`)).toHaveLength(200);
  });

  it("returns an empty string when nothing is left to name the document", () => {
    expect(titleFromFilename(".md")).toBe("");
  });
});

describe("MAX_IMPORT_BYTES", () => {
  it("caps an import at 5 MB", () => {
    expect(MAX_IMPORT_BYTES).toBe(5 * 1024 * 1024);
  });
});
