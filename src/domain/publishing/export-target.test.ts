import { describe, expect, it } from "vitest";
import {
  optionValue,
  secretOptionsOf,
  toTargetInfo,
  type ExportTarget,
} from "./export-target";

const target: ExportTarget = {
  id: "demo",
  label: "Demo",
  description: "A target used by the tests.",
  instructions: "Paste it somewhere.",
  mime: "text/plain",
  extension: "txt",
  options: [
    { id: "flavour", label: "Flavour", type: "select", default: "rich" },
    { id: "titleHeading", label: "Prepend the title", type: "toggle", default: "off" },
  ],
  render: () => "payload",
};

describe("optionValue", () => {
  it("prefers what the user saved", () => {
    expect(optionValue(target, { flavour: "storage" }, "flavour")).toBe("storage");
  });

  it("falls back to the target's own default when nothing was saved", () => {
    expect(optionValue(target, {}, "flavour")).toBe("rich");
  });

  it("keeps an explicitly emptied value instead of restoring the default", () => {
    expect(optionValue(target, { flavour: "" }, "flavour")).toBe("");
  });

  it("returns an empty string for an option the target does not declare", () => {
    expect(optionValue(target, {}, "unknown")).toBe("");
  });
});

describe("toTargetInfo", () => {
  it("drops render, which must never reach the browser bundle", () => {
    expect(toTargetInfo(target)).not.toHaveProperty("render");
  });

  it("keeps the fields the settings and export pages render", () => {
    expect(toTargetInfo(target)).toEqual({
      id: "demo",
      label: "Demo",
      description: "A target used by the tests.",
      instructions: "Paste it somewhere.",
      extension: "txt",
      binary: false,
      options: target.options,
    });
  });

  it("gives the optional fields a concrete value the client can rely on", () => {
    const bare = toTargetInfo({ ...target, options: undefined, binary: undefined });
    expect(bare.options).toEqual([]);
    expect(bare.binary).toBe(false);
  });
});

describe("secretOptionsOf", () => {
  it("names the options that hold a credential", () => {
    const withToken: ExportTarget = {
      ...target,
      options: [
        ...(target.options ?? []),
        { id: "token", label: "API token", type: "secret", default: "" },
      ],
    };

    expect(secretOptionsOf(withToken)).toEqual(["token"]);
  });

  it("names none for a target that asks for no credential", () => {
    expect(secretOptionsOf(target)).toEqual([]);
    expect(secretOptionsOf({ ...target, options: undefined })).toEqual([]);
  });
});
