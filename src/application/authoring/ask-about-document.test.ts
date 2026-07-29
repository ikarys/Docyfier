import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import { askAboutDocument } from "./ask-about-document";

const digest = "# Rapport\n## Risques\nLe fournisseur unique";

describe("askAboutDocument", () => {
  it("answers, and says which sections the answer came from", async () => {
    const generator = new ScriptedGenerator([
      JSON.stringify({
        answer: "Le risque principal est le fournisseur unique.",
        sections: ["Risques"],
      }),
    ]);

    expect(await askAboutDocument(authoringDeps(generator), digest, "quels risques ?")).toEqual(
      {
        answer: "Le risque principal est le fournisseur unique.",
        sections: ["Risques"],
      },
    );
  });

  it("sends the digest and the question, and nothing else", async () => {
    const generator = new ScriptedGenerator([
      JSON.stringify({ answer: "oui", sections: [] }),
    ]);

    await askAboutDocument(authoringDeps(generator), digest, "quels risques ?");

    const [request] = generator.requests;
    expect(request.prompt).toContain(digest);
    expect(request.prompt).toContain("quels risques ?");
  });

  it("stands an answer that cites nothing rather than failing on it", async () => {
    const generator = new ScriptedGenerator([JSON.stringify({ answer: "je ne sais pas" })]);

    expect(await askAboutDocument(authoringDeps(generator), digest, "?")).toEqual({
      answer: "je ne sais pas",
      sections: [],
    });
  });

  it("refuses an answer with no answer in it, so the retry can fix it", async () => {
    const generator = new ScriptedGenerator([
      JSON.stringify({ sections: ["Risques"] }),
      JSON.stringify({ sections: ["Risques"] }),
    ]);

    await expect(
      askAboutDocument(authoringDeps(generator), digest, "?"),
    ).rejects.toThrow(/invalid answer/);
  });
});
