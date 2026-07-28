import { describe, expect, it } from "vitest";
import { textToHtml } from "./source-html";

describe("plain text as HTML", () => {
  it("makes one paragraph per blank-line-separated block", () => {
    expect(textToHtml("first\n\nsecond")).toBe("<p>first</p><p>second</p>");
  });

  it("keeps a single newline as a line break inside the paragraph", () => {
    expect(textToHtml("one\ntwo")).toBe("<p>one<br>two</p>");
  });

  it("interprets nothing: a hash stays a hash, not a heading", () => {
    expect(textToHtml("# not a heading")).toBe("<p># not a heading</p>");
  });

  it("escapes markup so a text file cannot inject nodes", () => {
    expect(textToHtml("<b>bold</b> & co")).toBe(
      "<p>&lt;b&gt;bold&lt;/b&gt; &amp; co</p>",
    );
  });

  it("drops blank blocks rather than emitting empty paragraphs", () => {
    expect(textToHtml("only\n\n   \n\nthis")).toBe("<p>only</p><p>this</p>");
  });

  it("reads Windows line endings the same way", () => {
    expect(textToHtml("first\r\n\r\nsecond")).toBe("<p>first</p><p>second</p>");
  });
});
