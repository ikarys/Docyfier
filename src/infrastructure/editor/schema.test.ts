import { describe, expect, it } from "vitest";
import { validateDocJson } from "./schema";
import { TEMPLATES } from "@/lib/templates";
import { sampleChart } from "@/domain/documents/chart";
import { sampleDiagram } from "@/domain/documents/diagram/sample";

const text = (value: string) => ({ type: "text", text: value });
const doc = (...content: object[]) => ({ type: "doc", content });

/**
 * The gate between a model's output and a stored document: whatever it accepts
 * has to render, and whatever it rejects feeds the AI retry loop instead of
 * landing in the editor.
 */
describe("validateDocJson", () => {
  it("accepts a plain document", () => {
    const valid = doc({ type: "paragraph", content: [text("Bonjour")] });
    expect(validateDocJson(valid)).toBe(valid);
  });

  it("accepts the rich blocks the editor ships", () => {
    expect(() =>
      validateDocJson(
        doc(
          { type: "heading", attrs: { level: 2 }, content: [text("Titre")] },
          { type: "callout", content: [{ type: "paragraph", content: [text("note")] }] },
          { type: "chart", attrs: sampleChart() },
          { type: "diagram", attrs: sampleDiagram("architecture") },
        ),
      ),
    ).not.toThrow();
  });

  it("rejects anything that is not an object", () => {
    expect(() => validateDocJson(null)).toThrow(/not a JSON object/);
    expect(() => validateDocJson("doc")).toThrow(/not a JSON object/);
  });

  it("rejects a root that is not a doc, which is what a fenced answer produces", () => {
    expect(() => validateDocJson({ type: "paragraph" })).toThrow(/Root node must be/);
    expect(() => validateDocJson([{ type: "paragraph" }])).toThrow(/Root node must be/);
  });

  it("rejects a node type the editor cannot render", () => {
    expect(() => validateDocJson(doc({ type: "marquee" }))).toThrow();
  });

  it("rejects a block nested where the schema forbids it", () => {
    expect(() =>
      validateDocJson(doc({ type: "paragraph", content: [{ type: "paragraph" }] })),
    ).toThrow();
  });

  /**
   * ProseMirror only checks node shape; a chart's own rules have to fail here
   * too, or an unrenderable block gets persisted.
   */
  it("rejects a chart whose data would not draw", () => {
    const broken = { ...sampleChart(), series: [{ label: "s", values: [1] }] };
    expect(() => validateDocJson(doc({ type: "chart", attrs: broken }))).toThrow(
      /chart series "s" has 1 values/,
    );
  });

  it("rejects a diagram whose edge points at a node that was never declared", () => {
    const attrs = sampleDiagram("flow");
    const broken = { ...attrs, edges: [{ ...attrs.edges[0], to: "ghost" }] };
    expect(() => validateDocJson(doc({ type: "diagram", attrs: broken }))).toThrow(
      /points at "ghost"/,
    );
  });

  it("rejects a hierarchy the tree layout could not draw", () => {
    const attrs = sampleDiagram("hierarchy");
    const broken = { ...attrs, edges: [] };
    expect(() => validateDocJson(doc({ type: "diagram", attrs: broken }))).toThrow(
      /needs exactly one root, found 3/,
    );
  });
});

describe("TEMPLATES", () => {
  it("has no duplicate id", () => {
    const ids = TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    "%s is valid against the editor schema",
    (_id, template) => {
      expect(() => validateDocJson(template.content)).not.toThrow();
    },
  );
});
