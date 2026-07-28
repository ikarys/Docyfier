import { describe, expect, it } from "vitest";
import { ExportConfiguration } from "@/domain/publishing/export-configuration";
import type { ExportConfigurationRepository } from "@/domain/publishing/export-repository";
import type { ExportDocument, ExportTarget } from "@/domain/publishing/export-target";
import type { ExportTargetDeps } from "./deps";
import { availableTarget, enabledTargets, renderExport } from "./render-export";

/**
 * Joining the targets a build ships with the ones the user turned on. The rule
 * that matters here is that a disabled target does not exist: the pages hide it,
 * and so must every route that could still be reached by URL.
 */

const doc: ExportDocument = {
  title: "Rapport annuel",
  content: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "corps" }] }],
  },
};

function target(id: string, options: ExportTarget["options"] = []): ExportTarget {
  return {
    id,
    label: id,
    description: `The ${id} target.`,
    instructions: "Paste it somewhere.",
    mime: "text/plain",
    extension: "txt",
    options,
    render: (source, values) => `${id}:${source.title}:${JSON.stringify(values)}`,
  };
}

function deps(
  stored: Record<string, { enabled: boolean; options: Record<string, string> }>,
  targets: ExportTarget[],
  publicBaseUrl = "",
): ExportTargetDeps {
  const configuration: ExportConfigurationRepository = {
    load: async () => ExportConfiguration.restore(stored, publicBaseUrl, []),
    save: async () => {},
  };
  return { configuration, targets };
}

describe("enabledTargets", () => {
  it("lists only what the user turned on", async () => {
    const listed = await enabledTargets(
      deps({ notion: { enabled: true, options: {} } }, [target("notion"), target("docx")]),
    );

    expect(listed.map((info) => info.id)).toEqual(["notion"]);
  });

  it("keeps the registry's order, not the stored one", async () => {
    const listed = await enabledTargets(
      deps(
        { b: { enabled: true, options: {} }, a: { enabled: true, options: {} } },
        [target("a"), target("b")],
      ),
    );

    expect(listed.map((info) => info.id)).toEqual(["a", "b"]);
  });

  it("hands out infos, never the target itself", async () => {
    const [info] = await enabledTargets(
      deps({ notion: { enabled: true, options: {} } }, [target("notion")]),
    );

    expect(info).not.toHaveProperty("render");
  });
});

describe("availableTarget", () => {
  it("returns the target when it exists and is enabled", async () => {
    const found = await availableTarget(
      deps({ notion: { enabled: true, options: {} } }, [target("notion")]),
      "notion",
    );

    expect(found?.id).toBe("notion");
  });

  it("hides a target the user has not turned on", async () => {
    const found = await availableTarget(
      deps({ notion: { enabled: false, options: {} } }, [target("notion")]),
      "notion",
    );

    expect(found).toBeNull();
  });

  it("returns nothing for a target this build does not ship", async () => {
    expect(await availableTarget(deps({}, [target("notion")]), "dropbox")).toBeNull();
  });
});

describe("renderExport", () => {
  it("renders the document with the options the user saved", async () => {
    const rendered = await renderExport(
      deps({ notion: { enabled: true, options: { flavour: "rich" } } }, [target("notion")]),
      doc,
      "notion",
    );

    expect(rendered?.payload).toContain('"flavour":"rich"');
    expect(rendered?.payload).toContain("Rapport annuel");
  });

  it("names the file after the document and the target's extension", async () => {
    const rendered = await renderExport(
      deps({ notion: { enabled: true, options: {} } }, [target("notion")]),
      doc,
      "notion",
    );

    expect(rendered?.filename).toBe("Rapport-annuel.txt");
    expect(rendered?.mime).toBe("text/plain");
  });

  it("passes the instance's public origin, so a target can resolve an image", async () => {
    const rendered = await renderExport(
      deps(
        { notion: { enabled: true, options: {} } },
        [target("notion")],
        "https://docs.example.com",
      ),
      doc,
      "notion",
    );

    expect(rendered?.payload).toContain('"baseUrl":"https://docs.example.com"');
  });

  it("refuses to render a disabled target, which a URL could still reach", async () => {
    const rendered = await renderExport(
      deps({ notion: { enabled: false, options: {} } }, [target("notion")]),
      doc,
      "notion",
    );

    expect(rendered).toBeNull();
  });

  it("refuses an unknown target", async () => {
    expect(await renderExport(deps({}, [target("notion")]), doc, "dropbox")).toBeNull();
  });
});
