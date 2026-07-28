import { describe, expect, it } from "vitest";
import { stripUnsupportedHtml } from "./untrusted-html";

describe("HTML this instance did not write", () => {
  it("drops a script and everything it carried", () => {
    expect(stripUnsupportedHtml("<p>a</p><script>alert(1)</script><p>b</p>")).toBe(
      "<p>a</p><p>b</p>",
    );
  });

  it("drops styles, frames and embedded objects", () => {
    for (const tag of ["style", "iframe", "object", "embed"]) {
      expect(stripUnsupportedHtml(`<${tag} src="x">payload</${tag}>keep`)).toBe("keep");
    }
  });

  it("drops an image: its source points at a file this instance does not serve", () => {
    expect(stripUnsupportedHtml('<p>before<img src="https://elsewhere/x.png">after</p>')).toBe(
      "<p>beforeafter</p>",
    );
  });

  it("drops form inputs", () => {
    expect(stripUnsupportedHtml('<input type="text" value="x">text')).toBe("text");
  });

  it("leaves ordinary markup exactly as it was", () => {
    const html = "<h2>Title</h2><ul><li><strong>one</strong></li></ul>";

    expect(stripUnsupportedHtml(html)).toBe(html);
  });
});
