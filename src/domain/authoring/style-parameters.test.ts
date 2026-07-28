import { describe, expect, it } from "vitest";
import { StyleParameters } from "./style-parameters";

describe("style parameters", () => {
  it("default to what the product did before they existed", () => {
    expect(StyleParameters.defaults().toRecord()).toEqual({
      emoji: false,
      autoBold: false,
      statusBadges: true,
      smartTypography: true,
      language: "",
    });
  });

  it("keep what was stored and repair what was not", () => {
    const style = StyleParameters.restore({
      emoji: true,
      autoBold: "yes",
      language: "  French  ",
    });
    expect(style.toRecord()).toEqual({
      emoji: true,
      autoBold: false,
      statusBadges: true,
      smartTypography: true,
      language: "French",
    });
  });

  it("read a file that was never written", () => {
    expect(StyleParameters.restore(undefined).toRecord()).toEqual(
      StyleParameters.defaults().toRecord(),
    );
  });

  it("cut a language that is really a paragraph", () => {
    const style = StyleParameters.restore({ language: "x".repeat(80) });
    expect(style.toRecord().language).toHaveLength(40);
  });
});

describe("the directives they add to the style guide", () => {
  it("forbid emoji by default and allow them when asked", () => {
    expect(StyleParameters.defaults().directives()).toContain(
      "only when the user explicitly asks",
    );
    expect(StyleParameters.restore({ emoji: true }).directives()).toContain(
      "Emoji are welcome",
    );
  });

  it("ask for bold keywords only when the setting is on", () => {
    expect(StyleParameters.defaults().directives()).not.toContain("Bold the two or three");
    expect(StyleParameters.restore({ autoBold: true }).directives()).toContain(
      "Bold the two or three",
    );
  });

  it("drop the badge rule when badges are off", () => {
    expect(StyleParameters.defaults().directives()).toContain("badge marks");
    expect(StyleParameters.restore({ statusBadges: false }).directives()).not.toContain(
      "badge marks",
    );
  });

  it("say nothing about typing: smart typography steers the editor, not the model", () => {
    const off = StyleParameters.restore({ smartTypography: false });

    expect(off.smartTypography).toBe(false);
    expect(off.directives()).toBe(StyleParameters.defaults().directives());
  });

  it("impose a language, or follow the request", () => {
    expect(StyleParameters.defaults().directives()).toContain(
      "same language as the user's request",
    );
    const french = StyleParameters.restore({ language: "French" });
    expect(french.directives()).toContain("Write the document in French");
    expect(french.imposesLanguage).toBe(true);
    expect(StyleParameters.defaults().imposesLanguage).toBe(false);
  });
});
