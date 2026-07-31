import { describe, expect, it } from "vitest";
import { formatContract } from "./format-contract";

/**
 * The contract is the biggest thing every model call carries, so what each
 * scope leaves out is a rule about latency as much as about correctness.
 */
describe("the format contract, sized for its surface", () => {
  it("gives a whole document the blocks only a whole document has", () => {
    const contract = formatContract("document");

    expect(contract).toContain("docCover");
    expect(contract).toContain("tableOfContents");
    expect(contract).toContain("pageBreak");
  });

  it("hides those from a passage edit, which has no document to open", () => {
    const contract = formatContract("layout");

    expect(contract).not.toContain("::: docCover");
    expect(contract).not.toContain("::: tableOfContents");
  });

  it("gives the layout vocabulary to the assistant allowed to present content", () => {
    const contract = formatContract("layout");

    expect(contract).toContain("::: statRow");
    expect(contract).toContain("::: diagram");
    expect(contract).toContain("Allowed names");
  });

  /**
   * The writer's charter says it may not reach for a chart. A vocabulary it was
   * never given is a charter enforced rather than requested.
   */
  it("withholds every visual block from a prose-only assistant", () => {
    const contract = formatContract("prose");

    for (const block of ["statRow", "cardGrid", "chart", "diagram", "timeline", "pyramid"]) {
      expect(contract).not.toContain(`::: ${block} `);
    }
  });

  it("still tells it those blocks exist, so it hands back the ones it meets", () => {
    const contract = formatContract("prose");

    expect(contract).toContain("EXACTLY as you received them");
    expect(contract).toContain("statRow");
  });

  it("keeps the words and the marks in every scope", () => {
    for (const scope of ["document", "layout", "prose"] as const) {
      const contract = formatContract(scope);
      expect(contract).toContain("a line of text on its own is a paragraph");
      expect(contract).toContain("**bold**");
      expect(contract).toContain("| --- | :---: |");
    }
  });

  it("costs a prose pass far less than a whole document", () => {
    expect(formatContract("prose").length).toBeLessThan(
      formatContract("document").length / 2,
    );
  });

  /**
   * Measured when the syntax changed in STEP U14: stating the vocabulary in
   * markdown rather than in JSON took 9 136 characters down to 8 454 — seven
   * per cent, because what fills this contract is when to reach for a chart and
   * what a diagram may declare, not the punctuation around it. The saving is in
   * the document itself, which travels both ways; the contract only has to stop
   * growing back.
   */
  it("stays inside the budget the JSON contract set", () => {
    expect(formatContract("document").length).toBeLessThan(9000);
    expect(formatContract("prose").length).toBeLessThan(3700);
  });
});
