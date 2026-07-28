import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import type { ArtVocabulary } from "@/domain/authoring/art-direction";
import { defaultBrief } from "@/domain/authoring/brief";
import { planDocument, restyleDocument } from "./plan-document";

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

describe("restyleDocument", () => {
  const body = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Outage of March 3" }] },
      { type: "chart" },
    ],
  };

  it("dresses an existing document from what it is made of", async () => {
    const generator = new ScriptedGenerator([JSON.stringify(plan)]);

    const art = await restyleDocument(authoringDeps(generator), body, vocabulary);

    expect(art).toEqual({ preset: "corporate", accent: "#be123c" });
    expect(generator.requests[0].prompt).toContain("# Outage of March 3");
    expect(generator.requests[0].prompt).toContain("[chart]");
  });

  it("sends the document's shape, never its prose in full", async () => {
    const generator = new ScriptedGenerator([JSON.stringify(plan)]);
    const long = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(4000) }] }],
    };

    await restyleDocument(authoringDeps(generator), long, vocabulary);

    expect(generator.requests[0].prompt.length).toBeLessThan(1000);
  });

  it("leaves the document its own dress when the model proposes none", async () => {
    const generator = new ScriptedGenerator(["I like it as it is."]);

    expect(await restyleDocument(authoringDeps(generator), body, vocabulary)).toBeNull();
  });
});
