import { describe, expect, it } from "vitest";
import { ExportConfiguration, InvalidPublicUrl } from "./export-configuration";

const secretIds = { confluence: ["token"] };

const stored = {
  confluence: { enabled: true, options: { token: "sk-live", space: "DOC" } },
  notion: { enabled: false, options: {} },
};

/**
 * Which export targets are on, and what each one was configured with. The rules
 * here are what keeps a credential out of the browser and a target this build
 * no longer ships out of the settings file.
 */
describe("ExportConfiguration.restore", () => {
  it("keeps the targets that were configured", () => {
    const config = ExportConfiguration.restore(stored, "https://docs.example.com", []);

    expect(config.isEnabled("confluence")).toBe(true);
    expect(config.optionsFor("confluence")).toEqual({ token: "sk-live", space: "DOC" });
    expect(config.isEnabled("notion")).toBe(false);
  });

  it("turns on what the deployment enabled, without losing its options", () => {
    const config = ExportConfiguration.restore(stored, "", ["notion"]);

    expect(config.isEnabled("notion")).toBe(true);
  });

  it("reads option values as strings, whatever a hand-edited file holds", () => {
    const config = ExportConfiguration.restore(
      { confluence: { enabled: 1, options: { space: 42 } } },
      "",
      [],
    );

    expect(config.optionsFor("confluence")).toEqual({ space: "42" });
    expect(config.isEnabled("confluence")).toBe(true);
  });

  it("survives a file holding nothing at all", () => {
    const config = ExportConfiguration.restore(undefined, "", []);
    expect(config.optionsFor("confluence")).toEqual({});
    expect(config.isEnabled("confluence")).toBe(false);
  });
});

describe("a configuration crossing to the browser", () => {
  it("blanks the credentials and says only that they are set", () => {
    const summary = ExportConfiguration.restore(stored, "", []).toSummary(secretIds);

    expect(summary.targets.confluence.options.token).toBe("");
    expect(summary.targets.confluence.options.space).toBe("DOC");
    expect(summary.targets.confluence.savedSecrets).toEqual(["token"]);
    expect(JSON.stringify(summary)).not.toContain("sk-live");
  });

  it("reports no saved secret when the field was never filled", () => {
    const config = ExportConfiguration.restore(
      { confluence: { enabled: true, options: { token: "" } } },
      "",
      [],
    );

    expect(config.toSummary(secretIds).targets.confluence.savedSecrets).toEqual([]);
  });
});

describe("saving a configuration", () => {
  it("keeps a credential the form did not resend", () => {
    const config = ExportConfiguration.restore(stored, "", []).with(
      {
        targets: { confluence: { enabled: true, options: { space: "OPS" } } },
        publicBaseUrl: "",
      },
      secretIds,
    );

    expect(config.optionsFor("confluence")).toEqual({ token: "sk-live", space: "OPS" });
  });

  it("clears a credential the user explicitly emptied", () => {
    const config = ExportConfiguration.restore(stored, "", []).with(
      {
        targets: { confluence: { enabled: true, options: { token: "", space: "DOC" } } },
        publicBaseUrl: "",
      },
      secretIds,
    );

    expect(config.optionsFor("confluence").token).toBe("");
  });

  it("refuses a public URL that is not a URL, since images are built from it", () => {
    expect(() =>
      ExportConfiguration.restore(stored, "", []).with(
        { targets: {}, publicBaseUrl: "docs.example.com" },
        secretIds,
      ),
    ).toThrow(InvalidPublicUrl);
  });

  it("accepts an empty public URL: images then stay relative", () => {
    const config = ExportConfiguration.restore(stored, "", []).with(
      { targets: {}, publicBaseUrl: "  " },
      secretIds,
    );

    expect(config.publicBaseUrl).toBe("");
  });
});
