import { describe, expect, it } from "vitest";
import { blocksOf, titleHeading } from "@/domain/documents/body";
import { findTemplate, TEMPLATES } from "./templates";

describe("the template catalogue", () => {
  it("ships every template under its own id", () => {
    const ids = TEMPLATES.map((template) => template.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("hands each template the metadata the gallery renders", () => {
    for (const template of TEMPLATES) {
      expect(template.label).not.toBe("");
      expect(template.description).not.toBe("");
      expect(template.preset).not.toBe("");
      expect(template.thumb.length).toBeGreaterThan(0);
    }
  });

  it("starts every template on a document that already says something", () => {
    for (const template of TEMPLATES) {
      expect(template.content.type).toBe("doc");
      expect(blocksOf(template.content).length).toBeGreaterThan(0);
      expect(titleHeading(template.content)).toBeDefined();
    }
  });

  it("finds a template by id", () => {
    expect(findTemplate("meeting-notes")?.label).toBe("Meeting notes");
  });

  it("hands back nothing for an id it does not ship", () => {
    expect(findTemplate("no-such-template")).toBeUndefined();
    expect(findTemplate(42)).toBeUndefined();
  });
});
