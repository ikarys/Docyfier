import { beforeEach, describe, expect, it } from "vitest";
import {
  ExportConfiguration,
  type SecretOptionIds,
} from "@/domain/publishing/export-configuration";
import type { ExportConfigurationRepository } from "@/domain/publishing/export-repository";
import {
  exportSettings,
  exportSummary,
  saveExportSettings,
} from "./manage-exports";
import type { ExportConfigurationDeps } from "./deps";

const secretIds: SecretOptionIds = { confluence: ["token"] };

class InMemoryConfiguration implements ExportConfigurationRepository {
  savedSecretIds: SecretOptionIds | null = null;

  constructor(
    private configuration = ExportConfiguration.restore(
      { confluence: { enabled: true, options: { token: "sk-live", space: "DOC" } } },
      "",
      [],
    ),
  ) {}

  async load(): Promise<ExportConfiguration> {
    return this.configuration;
  }

  async save(
    configuration: ExportConfiguration,
    secrets: SecretOptionIds,
  ): Promise<void> {
    this.configuration = configuration;
    this.savedSecretIds = secrets;
  }
}

let deps: ExportConfigurationDeps & { configuration: InMemoryConfiguration };
beforeEach(() => {
  deps = { configuration: new InMemoryConfiguration() };
});

describe("exportSettings", () => {
  it("carries the credentials, because an export is built from them", async () => {
    const { targets } = await exportSettings(deps);
    expect(targets.confluence.options.token).toBe("sk-live");
  });
});

describe("exportSummary", () => {
  it("never carries a credential to the page that renders it", async () => {
    const summary = await exportSummary(deps, secretIds);

    expect(summary.targets.confluence.options.token).toBe("");
    expect(summary.targets.confluence.savedSecrets).toEqual(["token"]);
  });
});

describe("saveExportSettings", () => {
  it("keeps the stored credential when the form did not resend it", async () => {
    await saveExportSettings(
      deps,
      {
        targets: { confluence: { enabled: true, options: { space: "OPS" } } },
        publicBaseUrl: "",
      },
      secretIds,
    );

    const { targets } = await exportSettings(deps);
    expect(targets.confluence.options).toEqual({ token: "sk-live", space: "OPS" });
    expect(deps.configuration.savedSecretIds).toEqual(secretIds);
  });
});
