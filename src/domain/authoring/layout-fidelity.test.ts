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

  /**
   * A name that happens to hold a digit is not a figure, and a technical
   * drawing is made of them: `k8s`, `v2`, `astro-001`. Counting them meant a
   * diagram — which shortens a label and drops a note by design — was refused
   * for "dropping figures" it had never been given, so the conversion of any
   * architecture drawing could not succeed whatever the model answered.
   */
  it("does not read an identifier as a figure", () => {
    const source = [
      paragraph("Cluster astro-001 runs k8s with the kv/ v2 mount and auth k8s+jwt."),
    ];
    const drawn = [paragraph("Cluster runs the mount and the auth method.")];

    const drift = layoutDrift(source, drawn);
    expect(drift.lost).toEqual([]);
    expect(drift.invented).toEqual([]);
  });

  it("still reads a real quantity, however it is decorated", () => {
    const source = [paragraph("Revenue was 120k, up 18% over 2 quarters.")];
    const drift = layoutDrift(source, [paragraph("Revenue was 120k.")]);

    expect(drift.lost).toEqual(expect.arrayContaining(["18%", "2"]));
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

  /**
   * A rich ASCII drawing states a hundred words: every policy, every mount,
   * every resource name, most of them twice. A diagram of it carries a dozen
   * labels, because that is what drawing it means. Judged on how much of the
   * text it still holds, every real conversion was refused for "throwing away
   * most of the text it was given" — and the block came back unchanged.
   */
  it("does not ask a drawing to hold every word the text stated", () => {
    const ascii = {
      type: "codeBlock",
      content: [
        {
          type: "text",
          text: [
            "dev cluster: subscription astro_shared_dev (westeurope)",
            "  AKS cluster astro_shared_dev (namespace K8s: openbao)",
            "    OpenBao instance (raft, auto-unseal via AKV)",
            "      Root namespace (auth: oidc/)",
            "        policies: admin (path *), reader (path *)",
            "      OpenBao ns dev/   mount: kv/ (v2)   policies: eso-reader, dev-projects, ci-terraform   auth: k8s+jwt",
            "      OpenBao ns uat/   mount: kv/ (v2)   policies: eso-reader, uat-projects, ci-terraform   auth: k8s+jwt",
            "  Platform KV kv-astroshddev-platform: unseal-key, root-token, oidc-secret, recovery-keys",
            "  Managed Identity id-astroshddev-openbao-001 (Workload Identity)",
            "  Backup ST stastrobackupweu container: openbao (raft snapshots)",
          ].join("\n"),
        },
      ],
    };
    const drawn = {
      type: "diagram",
      attrs: {
        kind: "architecture",
        direction: "down",
        title: "OpenBao on the dev cluster",
        caption: null,
        groups: [
          { id: "sub", label: "subscription astro_shared_dev (westeurope)" },
          { id: "aks", label: "AKS cluster astro_shared_dev", parent: "sub" },
          { id: "bao", label: "OpenBao instance", parent: "aks" },
        ],
        nodes: [
          { id: "root", label: "Root namespace", note: "auth: oidc/", group: "bao" },
          { id: "dev", label: "OpenBao ns dev/", note: "mount: kv/ (v2)", group: "bao" },
          { id: "uat", label: "OpenBao ns uat/", note: "mount: kv/ (v2)", group: "bao" },
        ],
        edges: [],
      },
    };

    const drift = layoutDrift([ascii], [drawn]);
    expect(drift.keptRatio).toBeLessThan(0.5);
    expect(isFaithfulLayout(drift)).toBe(true);
  });

  /** Summarising is not licence to answer with something else entirely. */
  it("still refuses a drawing that kept almost nothing of the passage", () => {
    const prose = {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "The gateway checks the token, the broker queues the job, the worker writes the report and the mailer sends it to the requester.",
        },
      ],
    };
    const unrelated = {
      type: "diagram",
      attrs: {
        kind: "flow",
        direction: "down",
        title: null,
        caption: null,
        groups: [],
        nodes: [{ id: "a", label: "Something" }],
        edges: [],
      },
    };
    expect(isFaithfulLayout(layoutDrift([prose], [unrelated]))).toBe(false);
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
