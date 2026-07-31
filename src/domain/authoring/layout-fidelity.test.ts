import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@/domain/documents/body";
import { isFaithfulLayout, layoutBlocksIntroduced, layoutDrift } from "./layout-fidelity";

function paragraph(text: string): DocumentNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function cell(text: string): DocumentNode {
  return { type: "tableCell", content: [paragraph(text)] };
}

function row(...texts: string[]): DocumentNode {
  return { type: "tableRow", content: texts.map(cell) };
}

const SOURCE = [
  paragraph(
    "Vendor A costs 120k a year with 2 weeks of integration. Vendor B costs 90k a year with 6 weeks of integration.",
  ),
];

describe("layoutDrift", () => {
  it("accepts prose turned into a table, glue words dropped and headers added", () => {
    const table: DocumentNode = {
      type: "table",
      content: [
        row("Vendor", "Cost", "Integration"),
        row("Vendor A", "120k", "2 weeks"),
        row("Vendor B", "90k", "6 weeks"),
      ],
    };

    expect(isFaithfulLayout(layoutDrift(SOURCE, [table]))).toBe(true);
  });

  it("accepts the same words in another box", () => {
    const callout: DocumentNode = { type: "callout", content: SOURCE };

    expect(isFaithfulLayout(layoutDrift(SOURCE, [callout]))).toBe(true);
  });

  /** The failure this rule exists for: the layout pass writing explanations
   * nobody asked it for. That is the writer's job, in the designer's chair. */
  it("refuses a layout that explained the content instead of arranging it", () => {
    const steps: DocumentNode = {
      type: "stepList",
      content: [
        {
          type: "step",
          content: [
            paragraph("Vendor A"),
            paragraph(
              "Choosing Vendor A is the safest option because their support team answers around the clock and their integration record is excellent across similar migrations.",
            ),
          ],
        },
      ],
    };
    const drift = layoutDrift(SOURCE, [steps]);

    expect(drift.addedRatio).toBeGreaterThan(0.25);
    expect(isFaithfulLayout(drift)).toBe(false);
  });

  it("refuses a figure the source never stated", () => {
    const drift = layoutDrift(SOURCE, [paragraph("Vendor A costs 120k. Vendor B costs 75k.")]);

    expect(drift.invented).toContain("75k");
    expect(isFaithfulLayout(drift)).toBe(false);
  });

  it("refuses a layout that dropped a figure on the way", () => {
    const drift = layoutDrift(SOURCE, [paragraph("Vendor A costs 120k a year.")]);

    expect(drift.lost).toContain("90k");
    expect(isFaithfulLayout(drift)).toBe(false);
  });

  /** A currency sign is decoration, not a figure: reading "120k" as "$120k"
   * would report an invention on every prettified price. */
  it("reads a figure through the decoration around it", () => {
    const drift = layoutDrift(SOURCE, [
      paragraph("Vendor A: $120k, 2 weeks. Vendor B: $90k, 6 weeks."),
    ]);

    expect(drift.invented).toEqual([]);
    expect(drift.lost).toEqual([]);
  });

  it("refuses a layout that threw most of the content away", () => {
    const drift = layoutDrift(SOURCE, [paragraph("Vendors: 120k, 90k.")]);

    expect(drift.keptRatio).toBeLessThan(0.5);
    expect(isFaithfulLayout(drift)).toBe(false);
  });

  it("says a layout that emptied the block is not faithful", () => {
    expect(isFaithfulLayout(layoutDrift(SOURCE, []))).toBe(false);
  });
});

describe("layoutBlocksIntroduced", () => {
  it("names the presentation block a writer reached for", () => {
    const table: DocumentNode = { type: "table", content: [row("a")] };

    expect(layoutBlocksIntroduced(SOURCE, [table])).toEqual(["table"]);
  });

  it("says nothing when the writer kept the blocks it was given", () => {
    expect(layoutBlocksIntroduced(SOURCE, [paragraph("Rewritten."), paragraph("Split.")])).toEqual(
      [],
    );
  });

  /** Rewording inside a table is writing, not laying out: the passage already
   * had the table, so nothing was introduced. */
  it("does not blame a writer for a block the passage already had", () => {
    const table: DocumentNode = { type: "table", content: [row("a")] };

    expect(layoutBlocksIntroduced([table], [table])).toEqual([]);
  });
});

/**
 * The blocks whose words are not in their `content`.
 *
 * A diagram and a chart are atoms: every label they carry lives in their
 * attributes. A fidelity check that reads `content` alone sees an empty result,
 * calls it a passage thrown away, and refuses every conversion into one.
 */
describe("a passage turned into a block that has no content", () => {
  const ascii = {
    type: "codeBlock",
    content: [
      {
        type: "text",
        text: "| Workload pod |\n     |\n     v\n| OpenBao (validates the JWT) |\n     |\n     v\n| K8s Secret |",
      },
    ],
  };
  const drawn = {
    type: "diagram",
    attrs: {
      kind: "flow",
      direction: "down",
      nodes: [
        { id: "pod", label: "Workload pod" },
        { id: "bao", label: "OpenBao", note: "validates the JWT" },
        { id: "secret", label: "K8s Secret" },
      ],
      edges: [
        { from: "pod", to: "bao", label: null, style: "solid", head: "arrow" },
        { from: "bao", to: "secret", label: null, style: "solid", head: "arrow" },
      ],
      groups: [],
      title: null,
      caption: null,
    },
  };

  it("reads the labels a diagram carries in its attributes", () => {
    expect(isFaithfulLayout(layoutDrift([ascii], [drawn]))).toBe(true);
  });

  it("reads the figures a chart carries in its attributes", () => {
    const prose = {
      type: "paragraph",
      content: [{ type: "text", text: "Revenue was 12 in Q1 and 19 in Q2." }],
    };
    const chart = {
      type: "chart",
      attrs: {
        kind: "bar",
        categories: ["Q1", "Q2"],
        series: [{ label: "Revenue", values: [12, 19] }],
        title: null,
        caption: null,
        showGrid: true,
        showLegend: true,
      },
    };
    expect(layoutDrift([prose], [chart]).lost).toEqual([]);
  });
});
