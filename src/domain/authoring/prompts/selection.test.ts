import { describe, expect, it } from "vitest";
import { selectionBlocksPrompt } from "./selection";

describe("selectionBlocksPrompt", () => {
  it("carries the excerpt and the instruction with no skeleton given", () => {
    const prompt = selectionBlocksPrompt("Excerpt text", "Turn into a chart");
    expect(prompt).toBe("Excerpt:\nExcerpt text\n\nInstruction: Turn into a chart");
  });

  it("states a given skeleton as what the model must keep, not invent", () => {
    const skeleton = '{"nodes":[{"id":"a","label":"A"}],"groups":[],"edges":[]}';
    const prompt = selectionBlocksPrompt("Excerpt text", "Turn into a diagram", skeleton);
    expect(prompt).toContain("Excerpt:\nExcerpt text\n\nInstruction: Turn into a diagram");
    expect(prompt).toContain(skeleton);
    expect(prompt).toMatch(/use these ids, labels, groups and edges/i);
  });
});
