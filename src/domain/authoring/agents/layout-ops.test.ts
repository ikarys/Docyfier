import { describe, expect, it } from "vitest";
import type { DocOp } from "../ops";
import type { DocumentNode } from "@/domain/documents/body";
import { opBreach } from "./layout-ops";

function paragraph(text: string): DocumentNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

const ORIGINAL: DocumentNode = paragraph("Vendor A costs 120k a year. Vendor B costs 90k a year.");

function replace(...blocks: DocumentNode[]): DocOp {
  return { op: "replace", index: 0, through: 0, blocks };
}

describe("opBreach, for the layout assistant", () => {
  it("accepts a block put into a better box", () => {
    const table: DocumentNode = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("Vendor A")] },
            { type: "tableCell", content: [paragraph("120k")] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [paragraph("Vendor B")] },
            { type: "tableCell", content: [paragraph("90k")] },
          ],
        },
      ],
    };

    expect(opBreach("designer", replace(table), [ORIGINAL])).toBe("");
  });

  it("refuses a replacement that rewrote the block", () => {
    const rewritten = paragraph(
      "Vendor A is the safer choice here, and its support record across comparable migrations is excellent.",
    );

    expect(opBreach("designer", replace(rewritten), [ORIGINAL])).toMatch(/changed the text/i);
  });

  /** A heading or a caption is the layout assistant doing its job; a paragraph
   * is it writing one. */
  it("accepts an inserted heading", () => {
    const heading: DocumentNode = {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Vendor comparison" }],
    };

    expect(opBreach("designer", { op: "insert_after", index: 0, blocks: [heading] }, [ORIGINAL])).toBe(
      "",
    );
  });

  it("refuses an inserted paragraph", () => {
    const added = paragraph(
      "Taken together these figures show that the cheaper vendor also carries the longer integration, which the board should weigh.",
    );

    expect(
      opBreach("designer", { op: "insert_after", index: 0, blocks: [added] }, [ORIGINAL]),
    ).toMatch(/wrote/i);
  });

  it("refuses a deletion: arranging is not throwing away", () => {
    expect(opBreach("designer", { op: "delete", index: 0 }, [ORIGINAL])).toMatch(/removed/i);
  });

  /**
   * The operation the whole span exists for. Gathering loose paragraphs into
   * one card grid used to be a replace plus two deletes, and the deletes were
   * refused — leaving the grid *and* the paragraphs it had absorbed. Judged
   * across everything it covers, the same merge is plainly faithful.
   */
  it("accepts blocks gathered into one box", () => {
    const grid: DocumentNode = {
      type: "cardGrid",
      content: [
        { type: "card", content: [paragraph("Vendor A costs 120k a year.")] },
        { type: "card", content: [paragraph("Vendor B costs 90k a year.")] },
      ],
    };
    const loose = [paragraph("Vendor A costs 120k a year."), paragraph("Vendor B costs 90k a year.")];

    expect(opBreach("designer", { op: "replace", index: 0, through: 1, blocks: [grid] }, loose)).toBe(
      "",
    );
  });

  it("refuses a merge that dropped half of what it covered", () => {
    const kept: DocumentNode = {
      type: "cardGrid",
      content: [{ type: "card", content: [paragraph("Vendor A costs 120k a year.")] }],
    };
    const loose = [paragraph("Vendor A costs 120k a year."), paragraph("Vendor B costs 90k a year.")];

    expect(
      opBreach("designer", { op: "replace", index: 0, through: 1, blocks: [kept] }, loose),
    ).toMatch(/changed the text/i);
  });
});

describe("opBreach, for the writer", () => {
  it("accepts a rewritten paragraph", () => {
    expect(opBreach("writer", replace(paragraph("A: 120k. B: 90k.")), [ORIGINAL])).toBe("");
  });

  it("refuses the writer reaching for a layout block", () => {
    const table: DocumentNode = { type: "table", content: [] };

    expect(opBreach("writer", replace(table), [ORIGINAL])).toMatch(/layout assistant/i);
  });

  it("lets the writer delete what it was asked to remove", () => {
    expect(opBreach("writer", { op: "delete", index: 0 }, [ORIGINAL])).toBe("");
  });
});

describe("an op nobody can check", () => {
  /** An op addressing a block that is not there is caught by `parseOps`; if one
   * reaches here, judging it against nothing would refuse it for the wrong
   * reason. */
  it("passes when it covers no block at all", () => {
    expect(opBreach("designer", replace(paragraph("anything")), [])).toBe("");
  });
});
