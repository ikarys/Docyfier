import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import {
  completePlainText,
  rewriteSelectionBlocks,
  rewriteSelectionText,
} from "./rewrite-selection";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

describe("rewriteSelectionBlocks", () => {
  it("hands back the replacement blocks, not the document around them", async () => {
    const generator = new ScriptedGenerator([
      "Rewritten",
    ]);

    expect(
      await rewriteSelectionBlocks(
        authoringDeps(generator),
        [paragraph("Original")],
        "shorten",
      ),
    ).toEqual([paragraph("Rewritten")]);
  });

  /** Emptying the passage is what an assistant does when it has failed, not a
   * way of deleting it: refused here as it already is in `runAssignment`. */
  it("refuses an answer that holds no block at all", async () => {
    const generator = new ScriptedGenerator(["", ""]);

    await expect(
      rewriteSelectionBlocks(authoringDeps(generator), [paragraph("Original")], "shorten"),
    ).rejects.toThrow(/invalid answer/);
  });
});

/**
 * The inline rewrite replaces a fragment mid-sentence: anything the model wraps
 * around its answer would land in the document as characters.
 */
describe("rewriteSelectionText", () => {
  it("strips the fence, the quotes and the leftover emphasis markers", async () => {
    const generator = new ScriptedGenerator(['```\n"**Chiffre d\'affaires**"\n```']);

    expect(
      await rewriteSelectionText(authoringDeps(generator), "CA", "spell it out"),
    ).toBe("Chiffre d'affaires");
  });
});

describe("completePlainText", () => {
  it("unwraps an answer the model fenced despite being told not to", async () => {
    const generator = new ScriptedGenerator(["```\nSubject: Hello\n\nHi there\n```"]);

    expect(await completePlainText(authoringDeps(generator), "sys", "brief", 0.4)).toBe(
      "Subject: Hello\n\nHi there",
    );
  });

  it("keeps a fence the answer legitimately contains", async () => {
    const ticket = "Steps:\n```\nnpm run build\n```";
    const generator = new ScriptedGenerator([ticket]);

    expect(await completePlainText(authoringDeps(generator), "sys", "notes", 0.4)).toBe(
      ticket,
    );
  });

  it("says the answer was cut short rather than pasting half a mail", async () => {
    const generator = new ScriptedGenerator([{ text: "Subject: Hel", truncated: true }]);

    await expect(
      completePlainText(authoringDeps(generator), "sys", "brief", 0.4),
    ).rejects.toThrow(/output limit/);
  });
});
