import { describe, expect, it } from "vitest";
import { uploadFailureNote, uploadProgressNote } from "./upload-report";

describe("uploadProgressNote", () => {
  it("says nothing about counting when there is only one file", () => {
    expect(uploadProgressNote(0, 1)).toBe("Uploading…");
  });

  it("counts a batch, so a slow drop shows what is left", () => {
    expect(uploadProgressNote(0, 3)).toBe("Uploading… 1/3");
    expect(uploadProgressNote(2, 3)).toBe("Uploading… 3/3");
  });
});

describe("uploadFailureNote", () => {
  it("has nothing to report when every file went up", () => {
    expect(uploadFailureNote([])).toBeNull();
  });

  it("names the file and why, since 'upload failed' helps nobody", () => {
    expect(uploadFailureNote([{ name: "a.png", reason: "File too large" }])).toBe(
      "a.png — File too large",
    );
  });

  it("keeps every failure of a batch, on one line", () => {
    expect(
      uploadFailureNote([
        { name: "a.png", reason: "File too large" },
        { name: "b.svg", reason: "Type not allowed" },
      ]),
    ).toBe("a.png — File too large · b.svg — Type not allowed");
  });
});
