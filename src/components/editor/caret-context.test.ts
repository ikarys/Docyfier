import { describe, expect, it } from "vitest";
import { caretContextOf, caretLanding } from "./caret-context";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const body = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Rapport" }] },
    paragraph("Le trimestre s'achève"),
    { type: "paragraph" },
  ],
};

describe("caretContextOf", () => {
  it("sends what the document is about, not the document", () => {
    const context = caretContextOf(body, 1);
    expect(context.digest).toBe("# Rapport\nLe trimestre s'achève");
    expect(context.here).toBe("Le trimestre s'achève");
  });

  it("has no words to offer from an empty block", () => {
    expect(caretContextOf(body, 2).here).toBe("");
  });

  it("survives a caret the document has no block for", () => {
    expect(caretContextOf(body, 99).here).toBe("");
  });
});

describe("caretLanding", () => {
  it("replaces the empty paragraph an empty document starts life with", () => {
    expect(caretLanding({ type: "doc", content: [{ type: "paragraph" }] }, 0)).toBe(
      "replace",
    );
  });

  it("writes under a block that already says something", () => {
    expect(caretLanding(body, 1)).toBe("after");
  });

  it("writes under a block with no words but something to draw", () => {
    const withChart = { type: "doc", content: [{ type: "chart", attrs: {} }] };
    expect(caretLanding(withChart, 0)).toBe("after");
  });
});
