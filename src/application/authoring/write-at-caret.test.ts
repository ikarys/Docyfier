import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import { continueWriting, writeAtCaret } from "./write-at-caret";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

const somewhere = { digest: "# Rapport\nLe trimestre", here: "" };

describe("writeAtCaret", () => {
  it("hands back only the blocks to insert, never the document around them", async () => {
    const generator = new ScriptedGenerator([
      "Une conclusion",
    ]);

    expect(
      await writeAtCaret(authoringDeps(generator), somewhere, "write a conclusion"),
    ).toEqual([paragraph("Une conclusion")]);
  });

  it("sends the digest and never the document itself", async () => {
    const generator = new ScriptedGenerator([
      JSON.stringify({ type: "doc", content: [paragraph("ok")] }),
    ]);

    await writeAtCaret(
      authoringDeps(generator),
      { digest: "# Rapport", here: "Le trimestre s'achève" },
      "add a table",
    );

    const [request] = generator.requests;
    expect(request.prompt).toContain("# Rapport");
    expect(request.prompt).toContain("Le trimestre s'achève");
    expect(request.prompt).toContain("add a table");
  });

  it("refuses an answer that holds no block at all", async () => {
    const generator = new ScriptedGenerator(["", ""]);

    await expect(
      writeAtCaret(authoringDeps(generator), somewhere, "write something"),
    ).rejects.toThrow(/invalid answer/);
  });
});

describe("continueWriting", () => {
  it("hands back bare text, since it lands mid-document", async () => {
    const generator = new ScriptedGenerator(['```\n"la suite du paragraphe"\n```']);

    expect(
      await continueWriting(authoringDeps(generator), {
        digest: "# Rapport",
        here: "Le trimestre",
      }),
    ).toBe("la suite du paragraphe");
  });

  it("refuses to repeat the words it was given", async () => {
    const generator = new ScriptedGenerator(["Le trimestre s'achève bien"]);

    expect(
      await continueWriting(authoringDeps(generator), {
        digest: "",
        here: "Le trimestre",
      }),
    ).toBe("s'achève bien");
  });

  it("has nothing to offer when the model answered with nothing new", async () => {
    const generator = new ScriptedGenerator(["Le trimestre"]);

    expect(
      await continueWriting(authoringDeps(generator), {
        digest: "",
        here: "Le trimestre",
      }),
    ).toBeNull();
  });
});
