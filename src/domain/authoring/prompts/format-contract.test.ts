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

    expect(contract).not.toContain('"type":"docCover"');
    expect(contract).not.toContain('"type":"tableOfContents"');
  });

  it("gives the layout vocabulary to the assistant allowed to present content", () => {
    const contract = formatContract("layout");

    expect(contract).toContain('"type":"statRow"');
    expect(contract).toContain('"type":"diagram"');
    expect(contract).toContain("Allowed names");
  });

  /**
   * The writer's charter says it may not reach for a chart. A vocabulary it was
   * never given is a charter enforced rather than requested.
   */
  it("withholds every visual block from a prose-only assistant", () => {
    const contract = formatContract("prose");

    for (const block of ["statRow", "cardGrid", "chart", "diagram", "timeline", "pyramid"]) {
      expect(contract).not.toContain(`"type":"${block}"`);
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
      expect(contract).toContain('"type":"paragraph"');
      expect(contract).toContain('"type":"bold"');
      expect(contract).toContain('"type":"table"');
    }
  });

  it("costs a prose pass far less than a whole document", () => {
    expect(formatContract("prose").length).toBeLessThan(
      formatContract("document").length / 2,
    );
  });
});
