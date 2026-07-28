import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, findFontPair, resolveTokens, tokenStyle } from "./themes";

/**
 * The one thing themes do on this side of the line: become CSS. The token
 * vocabulary and its repair rules are the document's own, and are tested in
 * `src/domain/documents/theme.test.ts`.
 */
describe("tokenStyle", () => {
  it("emits the custom properties globals.css consumes", () => {
    const style = tokenStyle(resolveTokens({ preset: DEFAULT_PRESET }));
    expect(Object.keys(style).sort()).toEqual([
      "--doc-accent",
      "--doc-font-body",
      "--doc-font-heading",
      "--doc-radius",
      "--doc-space",
    ]);
  });

  it("maps the token vocabulary onto CSS values", () => {
    const style = tokenStyle({
      accent: "#123456",
      fontPair: "serif",
      radius: "sharp",
      density: "compact",
    }) as Record<string, string>;
    expect(style["--doc-accent"]).toBe("#123456");
    expect(style["--doc-radius"]).toBe("2px");
    expect(style["--doc-space"]).toBe("0.78");
    expect(style["--doc-font-heading"]).toBe(findFontPair("serif").heading);
  });
});
