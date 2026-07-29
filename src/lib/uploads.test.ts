import { describe, expect, it } from "vitest";
import { extensionFor, limitFor, mimeForName, uploadKind, uploadPath } from "./uploads";

describe("what an upload may be", () => {
  it("takes the raster images a document is illustrated with", () => {
    expect(extensionFor("image/png")).toBe("png");
    expect(uploadKind("image/jpeg")).toBe("image");
  });

  it("takes the documents a report is sent with", () => {
    expect(extensionFor("application/pdf")).toBe("pdf");
    expect(uploadKind("application/pdf")).toBe("file");
    expect(
      extensionFor(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
  });

  it("still refuses SVG, which is a document that can carry script", () => {
    expect(extensionFor("image/svg+xml")).toBeNull();
    expect(uploadKind("image/svg+xml")).toBeNull();
    expect(mimeForName("a.svg")).toBeNull();
  });

  it("gives a document more room than a picture, and neither of them all of it", () => {
    expect(limitFor("application/pdf")).toBeGreaterThan(limitFor("image/png"));
    expect(limitFor("application/x-msdownload")).toBe(0);
  });
});

describe("uploadPath", () => {
  it("accepts only the names this app writes", () => {
    expect(uploadPath("6f1c2f6e-0000-4000-8000-000000000000.png")).not.toBeNull();
    expect(uploadPath("6f1c2f6e-0000-4000-8000-000000000000.pdf")).not.toBeNull();
  });

  it("refuses a traversal, an extension nobody stored, and a bare name", () => {
    expect(uploadPath("../../etc/passwd")).toBeNull();
    expect(uploadPath("a.svg")).toBeNull();
    expect(uploadPath("a.png/../b")).toBeNull();
  });
});
