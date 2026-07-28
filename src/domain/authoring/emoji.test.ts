import { describe, expect, it } from "vitest";
import { stripEmoji, stripEmojiFromText } from "./emoji";

describe("stripping emoji from a fragment", () => {
  it("takes the space that decorated the emoji with it", () => {
    expect(stripEmojiFromText("🎉 Results")).toBe("Results");
    expect(stripEmojiFromText("Done ✅")).toBe("Done");
    expect(stripEmojiFromText("before 🚀 after")).toBe("before after");
  });

  it("removes a composed emoji whole, joiner and variation selector included", () => {
    expect(stripEmojiFromText("Team 👨‍👩‍👧‍👦 update")).toBe("Team update");
    expect(stripEmojiFromText("Warning ⚠️ here")).toBe("Warning here");
  });

  it("leaves text that carries no emoji exactly as it was", () => {
    expect(stripEmojiFromText(" a leading space matters ")).toBe(
      " a leading space matters ",
    );
    expect(stripEmojiFromText("100% — 3x faster")).toBe("100% — 3x faster");
  });
});

describe("stripping emoji from a document", () => {
  it("reaches text at any depth", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { variant: "tip" },
          content: [
            { type: "paragraph", content: [{ type: "text", text: "💡 Try this" }] },
          ],
        },
      ],
    };
    expect(stripEmoji(doc)).toEqual({
      type: "doc",
      content: [
        {
          type: "callout",
          attrs: { variant: "tip" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Try this" }] }],
        },
      ],
    });
  });

  it("drops a text node that was nothing but an emoji", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "🎯" },
            { type: "text", text: "Goal", marks: [{ type: "bold" }] },
          ],
        },
      ],
    };
    expect(stripEmoji(doc).content?.[0].content).toEqual([
      { type: "text", text: "Goal", marks: [{ type: "bold" }] },
    ]);
  });

  it("hands back anything that is not a document untouched", () => {
    expect(stripEmoji({ type: "paragraph" })).toEqual({ type: "paragraph" });
  });
});
