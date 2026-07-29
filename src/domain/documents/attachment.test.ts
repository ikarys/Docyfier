import { describe, expect, it } from "vitest";
import { attachmentLabel, fileSizeLabel } from "./attachment";

describe("fileSizeLabel", () => {
  it("counts bytes while there are few enough to count", () => {
    expect(fileSizeLabel(0)).toBe("0 B");
    expect(fileSizeLabel(999)).toBe("999 B");
  });

  it("rounds a kilobyte count, where a decimal would be noise", () => {
    expect(fileSizeLabel(1000)).toBe("1 kB");
    expect(fileSizeLabel(845_300)).toBe("845 kB");
  });

  it("keeps one decimal on megabytes, where it is the whole news", () => {
    expect(fileSizeLabel(1_200_000)).toBe("1.2 MB");
    expect(fileSizeLabel(24_000_000)).toBe("24.0 MB");
  });

  it("says nothing about a size nobody recorded", () => {
    expect(fileSizeLabel(-1)).toBeNull();
    expect(fileSizeLabel(Number.NaN)).toBeNull();
  });
});

describe("attachmentLabel", () => {
  it("names the file and how heavy it is", () => {
    expect(attachmentLabel("rapport.pdf", 1_200_000)).toBe("rapport.pdf · 1.2 MB");
  });

  it("falls back to the name alone when there is no size to give", () => {
    expect(attachmentLabel("rapport.pdf", 0)).toBe("rapport.pdf · 0 B");
    expect(attachmentLabel("rapport.pdf", -1)).toBe("rapport.pdf");
  });

  it("falls back to something clickable when the name went missing", () => {
    expect(attachmentLabel("", 1000)).toBe("Attachment · 1 kB");
  });
});
