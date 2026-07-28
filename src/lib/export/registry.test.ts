import { describe, expect, it } from "vitest";
import { exportFilename } from "@/domain/publishing/export-filename";
import { optionValue, type ExportDocument } from "@/domain/publishing/export-target";
import { EXPORT_TARGETS, exportTargetInfos, findExportTarget, secretOptionIds } from "./registry";

const doc: ExportDocument = {
  title: "Rapport annuel",
  content: {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titre" }] },
      { type: "paragraph", content: [{ type: "text", text: "Un paragraphe." }] },
    ],
  },
};

/** Every target rendered with the options it declares as defaults. */
function renderWithDefaults(target: (typeof EXPORT_TARGETS)[number]) {
  const values = Object.fromEntries(
    (target.options ?? []).map((option) => [option.id, optionValue(target, {}, option.id)]),
  );
  return target.render(doc, values);
}

const cases = EXPORT_TARGETS.map((target) => [target.id, target] as const);

/**
 * The contract every export target signs. A target that breaks one of these
 * produces a download the receiving tool refuses — and nothing here fails at
 * build time, so it has to fail here.
 */
describe("EXPORT_TARGETS", () => {
  it("has no duplicate id", () => {
    const ids = EXPORT_TARGETS.map((target) => target.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(cases)("%s describes itself for the settings and export pages", (_id, target) => {
    expect(target.label.trim()).not.toBe("");
    expect(target.description.trim()).not.toBe("");
    expect(target.instructions.trim()).not.toBe("");
    expect(target.mime).toMatch(/^[\w.-]+\/[\w.+-]+$/);
    expect(target.extension).toMatch(/^[a-z0-9]+$/);
  });

  it.each(cases)("%s gives every option a default it can render", (_id, target) => {
    for (const option of target.options ?? []) {
      expect(option.label.trim()).not.toBe("");
      if (option.type === "toggle") expect(["on", "off"]).toContain(option.default);
      if (option.type === "select") {
        expect(option.choices?.some((c) => c.value === option.default)).toBe(true);
      }
    }
  });

  it.each(cases)("%s renders a payload of the kind it declares", async (_id, target) => {
    const payload = await renderWithDefaults(target);
    if (target.binary) expect(payload).toBeInstanceOf(Uint8Array);
    else expect(typeof payload).toBe("string");
    expect(payload.length).toBeGreaterThan(0);
  });

  it.each(cases)("%s keeps the document's text in its payload", async (_id, target) => {
    if (target.binary) return;
    expect(await renderWithDefaults(target)).toContain("Un paragraphe.");
  });

  it.each(cases)("%s renders an empty document without throwing", async (_id, target) => {
    // `render` may be sync or async; the contract only promises a payload.
    const payload = await target.render({ title: "Vide", content: { type: "doc" } }, {});
    expect(payload).toBeDefined();
  });

  it.each(cases)("%s produces a filename a filesystem accepts", (_id, target) => {
    expect(exportFilename(doc.title, target.extension)).toBe(
      `Rapport-annuel.${target.extension}`,
    );
  });
});

describe("findExportTarget", () => {
  it("finds a target by id", () => {
    expect(findExportTarget("notion")?.id).toBe("notion");
  });

  it("returns undefined for an unknown id, so a URL cannot reach a target that is not there", () => {
    expect(findExportTarget("dropbox")).toBeUndefined();
  });
});

describe("exportTargetInfos", () => {
  it("hands the client one info per target, none carrying render", () => {
    const infos = exportTargetInfos();
    expect(infos).toHaveLength(EXPORT_TARGETS.length);
    for (const info of infos) expect(info).not.toHaveProperty("render");
  });
});

/**
 * What decides that a stored value is encrypted at rest and never sent back to
 * the browser. A target that declares a credential and is missing here would
 * have it written to disk in the clear.
 */
describe("secretOptionIds", () => {
  const ids = secretOptionIds();

  it("names every credential option each target declares", () => {
    for (const target of EXPORT_TARGETS) {
      const declared = (target.options ?? [])
        .filter((option) => option.type === "secret")
        .map((option) => option.id);
      if (declared.length) expect(ids[target.id]).toEqual(declared);
    }
  });

  it("leaves out the targets that ask for no credential", () => {
    for (const target of EXPORT_TARGETS) {
      const asks = (target.options ?? []).some((option) => option.type === "secret");
      if (!asks) expect(ids).not.toHaveProperty(target.id);
    }
  });

  it("never names an option that is not a credential", () => {
    for (const [targetId, secrets] of Object.entries(ids)) {
      const target = findExportTarget(targetId);
      for (const id of secrets) {
        expect(target?.options?.find((option) => option.id === id)?.type).toBe("secret");
      }
    }
  });
});
