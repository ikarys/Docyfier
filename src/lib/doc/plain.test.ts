import { describe, expect, it } from "vitest";
import { toPlainJSON } from "./plain";

/**
 * The bug this guards: ProseMirror builds `attrs` with `Object.create(null)`,
 * and React Server Functions reject null-prototype objects — the attrs were
 * silently dropped, so headings lost their level and callouts their variant.
 */
describe("toPlainJSON", () => {
  it("gives null-prototype attrs a real prototype", () => {
    const attrs = Object.assign(Object.create(null), { level: 2 });
    expect(Object.getPrototypeOf(attrs)).toBeNull();

    const plain = toPlainJSON({ type: "heading", attrs });

    expect(Object.getPrototypeOf(plain.attrs)).toBe(Object.prototype);
    expect(plain.attrs).toEqual({ level: 2 });
  });

  it("reaches nested attrs, not only the root's", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: Object.assign(Object.create(null), { variant: "warn" }),
          content: [],
        },
      ],
    };

    const plain = toPlainJSON(doc);

    expect(Object.getPrototypeOf(plain.content[0].attrs)).toBe(Object.prototype);
  });

  it("copies rather than aliases, so the editor's tree cannot be mutated", () => {
    const doc = { type: "doc", content: [{ type: "paragraph" }] };
    const plain = toPlainJSON(doc);

    expect(plain).toEqual(doc);
    expect(plain).not.toBe(doc);
    expect(plain.content?.[0]).not.toBe(doc.content[0]);
  });

  it("accepts a bare array of blocks, as the selection surfaces send", () => {
    expect(toPlainJSON([{ type: "paragraph" }])).toEqual([{ type: "paragraph" }]);
  });
});
