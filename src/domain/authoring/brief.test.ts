import { describe, expect, it } from "vitest";
import type { ArtVocabulary } from "./art-direction";
import { defaultBrief, readBrief } from "./brief";

const vocabulary: ArtVocabulary = {
  presets: [{ id: "corporate", hint: "business" }],
  fontPairs: [{ id: "sans", hint: "modern sans" }],
  radii: ["sharp", "soft", "round"],
  densities: ["compact", "normal", "airy"],
};

const full = {
  kind: "postmortem",
  audience: "the on-call team and their director",
  tone: "factual, blameless",
  language: "French",
  sections: [
    { heading: "Impact", block: "callout", note: "severity and duration" },
    { heading: "Timeline", block: "timeline" },
  ],
  art: { preset: "corporate", accent: "#2563EB" },
};

describe("readBrief", () => {
  it("reads a complete plan", () => {
    expect(readBrief(full, vocabulary)).toEqual({
      kind: "postmortem",
      audience: "the on-call team and their director",
      tone: "factual, blameless",
      language: "French",
      sections: [
        { heading: "Impact", block: "callout", note: "severity and duration" },
        { heading: "Timeline", block: "timeline" },
      ],
      art: { preset: "corporate", accent: "#2563eb" },
    });
  });

  it("falls back to the default kind when the model invents one", () => {
    expect(readBrief({ ...full, kind: "haiku" }, vocabulary).kind).toBe(
      defaultBrief().kind,
    );
  });

  it("survives an answer that is not an object at all", () => {
    expect(readBrief("a postmortem, I guess", vocabulary)).toEqual(defaultBrief());
    expect(readBrief(null, vocabulary)).toEqual(defaultBrief());
  });

  it("drops the sections it cannot use and keeps the rest", () => {
    const brief = readBrief(
      {
        ...full,
        sections: [
          { heading: "  Impact  ", block: "callout" },
          { heading: "", block: "table" },
          "Timeline",
          { block: "chart" },
          { heading: "Actions" },
        ],
      },
      vocabulary,
    );
    expect(brief.sections).toEqual([
      { heading: "Impact", block: "callout" },
      { heading: "Actions" },
    ]);
  });

  it("keeps a plan short enough to stay a plan", () => {
    const sections = Array.from({ length: 30 }, (_, i) => ({ heading: `S${i}` }));
    expect(readBrief({ ...full, sections }, vocabulary).sections).toHaveLength(12);
  });

  it("cuts a field the model turned into an essay", () => {
    const brief = readBrief({ ...full, audience: "x".repeat(500) }, vocabulary);
    expect(brief.audience.length).toBeLessThanOrEqual(160);
  });

  it("hands back no art when the direction names an unknown preset", () => {
    expect(readBrief({ ...full, art: { preset: "neon" } }, vocabulary).art).toBeNull();
    expect(readBrief({ ...full, art: undefined }, vocabulary).art).toBeNull();
  });

  it("plans nothing rather than guessing when sections are missing", () => {
    expect(readBrief({ kind: "report" }, vocabulary)).toEqual({
      kind: "report",
      audience: "",
      tone: "",
      language: "",
      sections: [],
      art: null,
    });
  });
});
