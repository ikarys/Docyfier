import { describe, expect, it } from "vitest";
import { MAX_LABEL, MAX_NODES, MAX_NOTE } from "./diagram";
import { parseAsciiDiagram } from "./ascii-parse";

function boxLines(...content: string[]): string[] {
  const width = Math.max(...content.map((line) => line.length)) + 4;
  const top = `┌${"─".repeat(width - 2)}┐`;
  const bottom = `└${"─".repeat(width - 2)}┘`;
  const body = content.map((line) => `│ ${line}${" ".repeat(width - 4 - line.length)} │`);
  return [top, ...body, bottom];
}

function manyBoxes(count: number): string {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) lines.push(...boxLines(`Box ${i}`), "");
  return lines.join("\n");
}

// The exact drawing that shipped without a "parent" chain on every group —
// verbatim, including the column drift a hand-typed drawing really has.
const REPORTED_BUG = `┌──────────────────────────────────────────────────────────────────────┐
  │  dev cluster: subscription astro_shared_dev (westeurope)            │
  │                                                                      │
  │  ┌──────────────────────────────────────────────────────────────┐   │
  │  │  AKS cluster astro_shared_dev (namespace K8s: openbao)       │   │
  │  │                                                              │   │
  │  │  ┌────────────────────────────────────────────────────┐      │   │
  │  │  │  OpenBao instance (raft, auto-unseal via AKV)        │      │   │
  │  │  │                                                      │      │   │
  │  │  │  Root namespace (auth: oidc/)                        │      │   │
  │  │  │    policies: admin (path *), reader (path *)         │      │   │
  │  │  │                                                      │      │   │
  │  │  │  ┌────────────────────┐  ┌────────────────────┐       │      │   │
  │  │  │  │ OpenBao ns "dev/" │  │ OpenBao ns "uat/" │       │      │   │
  │  │  │  │  mount: kv/ (v2)  │  │  mount: kv/ (v2)  │       │      │   │
  │  │  │  │  policies:        │  │  policies:        │       │      │   │
  │  │  │  │    eso-reader    │  │    eso-reader    │       │      │   │
  │  │  │  │    dev-projects  │  │    uat-projects  │       │      │   │
  │  │  │  │    ci-terraform  │  │    ci-terraform  │       │      │   │
  │  │  │  │  auth: k8s+jwt  │  │  auth: k8s+jwt  │       │      │   │
  │  │  │  └────────────────────┘  └────────────────────┘       │      │   │
  │  │  └────────────────────────────────────────────────────┘      │   │
  │  └──────────────────────────────────────────────────────────────┘   │
  │                                                                      │
  │  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐  │
  │  │  Platform KV    │   │ Managed Identity │   │  Backup ST       │  │
  │  │ kv-astroshddev  │   │ id-astroshddev   │   │ stastrobackupweu │  │
  │  │ -platform       │   │ -openbao-001     │   │ container: openbao│ │
  │  │ • unseal-key    │   │ (Workload Ident.)│   │ (raft snapshots) │  │
  │  │ • root-token    │   └──────────────────┘   └──────────────────┘  │
  │  │ • oidc-secret   │                                                 │
  │  │ • recovery-keys │                                                 │
  │  └──────────────────┘                                                 │
  └──────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │  prd cluster: subscription astro_shared_prd (westeurope) — SEPARATE  │
  │  Own OpenBao instance (own AKV, own MI, own ST). Blast-radius         │
  │  isolation: a dev outage must never affect prd.                       │
  └──────────────────────────────────────────────────────────────────────┘
`;

describe("parseAsciiDiagram", () => {
  it("returns null for prose with no drawing in it", () => {
    expect(parseAsciiDiagram("Just a paragraph about a cluster.")).toBeNull();
  });

  it("returns null for an unclosed box", () => {
    expect(parseAsciiDiagram("┌─────┐\n│ Oops")).toBeNull();
  });

  /**
   * This is the reported bug, pinned: three groups, each naming the one
   * directly outside it — "aks-cluster..." parented on "dev-cluster...",
   * "openbao-instance..." parented on "aks-cluster...". Losing that chain is
   * exactly what the model did; a deterministic parser cannot.
   */
  it("reads the full containment chain out of the reported drawing", () => {
    const parsed = parseAsciiDiagram(REPORTED_BUG);
    expect(parsed).not.toBeNull();

    expect(parsed!.groups).toEqual([
      {
        id: "dev-cluster-subscription-astro-shared-dev-westeurope",
        label: "dev cluster: subscription astro_shared_dev (westeurope)",
      },
      {
        id: "aks-cluster-astro-shared-dev-namespace-k8s-openbao",
        label: "AKS cluster astro_shared_dev (namespace K8s: openbao)",
        parent: "dev-cluster-subscription-astro-shared-dev-westeurope",
      },
      {
        id: "openbao-instance-raft-auto-unseal-via-akv",
        label: "OpenBao instance (raft, auto-unseal via AKV)",
        parent: "aks-cluster-astro-shared-dev-namespace-k8s-openbao",
      },
    ]);

    const byId = new Map(parsed!.nodes.map((node) => [node.id, node]));
    expect(byId.get("platform-kv")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("managed-identity")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("backup-st")?.group).toBe(
      "dev-cluster-subscription-astro-shared-dev-westeurope",
    );
    expect(byId.get("openbao-ns-dev")?.group).toBe("openbao-instance-raft-auto-unseal-via-akv");
    expect(byId.get("openbao-ns-uat")?.group).toBe("openbao-instance-raft-auto-unseal-via-akv");
    expect(byId.get("prd-cluster-subscription-astro-shared-prd-westeurope-separate")?.group).toBeUndefined();

    expect(parsed!.edges).toEqual([]);
  });

  /**
   * A skeleton the model is told to reproduce exactly ("use these ids,
   * labels, groups and edges — invent none, drop none") can never validate
   * once it breaks a hard limit `diagramError` itself enforces: the parser
   * must refuse before handing over something no correction can fix.
   */
  it("returns null when the drawing holds more boxes than a diagram may declare", () => {
    expect(parseAsciiDiagram(manyBoxes(MAX_NODES + 2))).toBeNull();
  });

  it("returns null when a box's heading is longer than the label limit", () => {
    const source = boxLines("L".repeat(MAX_LABEL + 5)).join("\n");
    expect(parseAsciiDiagram(source)).toBeNull();
  });

  it("truncates a note down to the note limit rather than refusing the drawing", () => {
    const source = boxLines("Heading", "x".repeat(MAX_NOTE + 5)).join("\n");
    const parsed = parseAsciiDiagram(source);
    expect(parsed).not.toBeNull();
    const note = parsed!.nodes[0].note!;
    expect(note.length).toBeLessThanOrEqual(MAX_NOTE);
    expect(note.endsWith("…")).toBe(true);
  });

  it("cuts a truncated note at the last '; ' boundary so no item is chopped mid-word", () => {
    const items = ["first detail", "second detail", "x".repeat(MAX_NOTE)];
    const source = boxLines("Heading", ...items).join("\n");
    const parsed = parseAsciiDiagram(source);
    const note = parsed!.nodes[0].note!;
    expect(note).toBe("first detail; second detail…");
  });

  it("resolves an arrow to the two node ids it connects", () => {
    const source = [
      "┌─────┐        ┌─────┐",
      "│  A  │------->│  B  │",
      "└─────┘        └─────┘",
    ].join("\n");
    const parsed = parseAsciiDiagram(source);
    expect(parsed).not.toBeNull();
    expect(parsed!.nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(parsed!.edges).toEqual([{ from: "a", to: "b", label: null, style: "solid", head: "arrow" }]);
  });
});
