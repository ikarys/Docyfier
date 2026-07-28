import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import type { ArtVocabulary } from "@/domain/authoring/art-direction";
import { defaultBrief } from "@/domain/authoring/brief";
import { planDocument } from "./plan-document";

const vocabulary: ArtVocabulary = {
  presets: [{ id: "corporate", hint: "business" }],
  fontPairs: [{ id: "sans", hint: "modern sans" }],
  radii: ["sharp", "soft", "round"],
  densities: ["compact", "normal", "airy"],
};

const plan = {
  kind: "postmortem",
  audience: "the on-call team",
  tone: "factual",
  language: "English",
  sections: [{ heading: "Impact", block: "callout" }],
  art: { preset: "corporate", accent: "#be123c" },
};

describe("planDocument", () => {
  it("reads the plan the model returned", async () => {
    const generator = new ScriptedGenerator([JSON.stringify(plan)]);

    const brief = await planDocument(
      authoringDeps(generator),
      "Write up yesterday's outage",
      vocabulary,
    );

    expect(brief.kind).toBe("postmortem");
    expect(brief.sections).toEqual([{ heading: "Impact", block: "callout" }]);
    expect(brief.art).toEqual({ preset: "corporate", accent: "#be123c" });
  });

  it("offers the model every kind and every preset it may choose", async () => {
    const generator = new ScriptedGenerator([JSON.stringify(plan)]);

    await planDocument(authoringDeps(generator), "Write a roadmap", vocabulary);

    const { system } = generator.requests[0];
    expect(system).toContain('"roadmap"');
    expect(system).toContain('"corporate"');
    expect(system).toContain("compact");
  });

  it("plans a document rather than failing on an unreadable answer", async () => {
    const generator = new ScriptedGenerator(["I would start with an introduction."]);

    expect(await planDocument(authoringDeps(generator), "Write a note", vocabulary)).toEqual(
      defaultBrief(),
    );
  });

  it("asks once: a plan is not worth a second round-trip", async () => {
    const generator = new ScriptedGenerator(["nonsense", JSON.stringify(plan)]);

    await planDocument(authoringDeps(generator), "Write a note", vocabulary);

    expect(generator.requests).toHaveLength(1);
  });
});
