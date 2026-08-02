import { describe, expect, it } from "vitest";
import { parseAsciiDiagram } from "./ascii-parse";

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
