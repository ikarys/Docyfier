import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { beautify } from "./beautify";

const text = (value: string, marks?: JSONContent["marks"]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (value: string) => ({ type: "paragraph", content: [text(value)] });
const cell = (value: string) => ({ type: "tableCell", content: [p(value)] });
const row = (...values: string[]) => ({ type: "tableRow", content: values.map(cell) });
const table = (...rows: JSONContent[]) => ({ type: "table", content: rows });
const doc = (...content: JSONContent[]) => ({ type: "doc", content });

/**
 * The deterministic pass after the model. Its job is the upgrades the LLM
 * applies only some of the time — so the same input must always come out the
 * same way, and anything it cannot upgrade must survive untouched.
 */
describe("beautify", () => {
  it("turns a two-column table of figures into a stat row", () => {
    const out = beautify(doc(table(row("Documents", "42"), row("Exports", "18"))));
    const statRow = out.content?.[0] as JSONContent;

    expect(statRow.type).toBe("statRow");
    expect(statRow.content).toHaveLength(2);
    expect(statRow.content?.[0].content?.[0]).toEqual({
      type: "paragraph",
      content: [text("42")],
    });
    expect(statRow.content?.[0].content?.[1]).toEqual({
      type: "paragraph",
      content: [text("Documents")],
    });
  });

  it("turns a two-column table of prose into a card grid", () => {
    const out = beautify(
      doc(
        table(
          row("Contexte", "Le projet a démarré en janvier avec trois équipes."),
          row("Objectif", "Livrer une première version avant la fin du trimestre."),
        ),
      ),
    );
    const grid = out.content?.[0] as JSONContent;

    expect(grid.type).toBe("cardGrid");
    expect(grid.attrs).toMatchObject({ cols: 2 });
    expect(grid.content?.[0].type).toBe("card");
    expect(grid.content?.[0].content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 3 },
    });
  });

  it("gives each stat and card its own accent, cycling through the palette", () => {
    const rows = [row("a", "1"), row("b", "2"), row("c", "3"), row("d", "4")];
    const statRow = beautify(doc(table(...rows))).content?.[0] as JSONContent;
    const accents = statRow.content?.map((stat) => stat.attrs?.accent);

    expect(new Set(accents).size).toBe(4);
  });

  it("leaves a table alone when it does not fit the label/value pattern", () => {
    const threeColumns = table(row("a", "b", "c"), row("d", "e", "f"));
    expect(beautify(doc(threeColumns)).content?.[0]).toEqual(threeColumns);

    const oneRow = table(row("a", "1"));
    expect(beautify(doc(oneRow)).content?.[0]).toEqual(oneRow);

    const fiveRows = table(
      row("a", "1"),
      row("b", "2"),
      row("c", "3"),
      row("d", "4"),
      row("e", "5"),
    );
    expect(beautify(doc(fiveRows)).content?.[0]).toEqual(fiveRows);
  });

  it("does not read a long value as a figure", () => {
    const prose = table(row("a", "42 documents traités"), row("b", "18 exports"));
    expect((beautify(doc(prose)).content?.[0] as JSONContent).type).toBe("cardGrid");
  });

  it("strips the colours a model invented on a heading — the theme owns them", () => {
    const heading = {
      type: "heading",
      attrs: { level: 1 },
      content: [
        text("Titre", [
          { type: "textStyle", attrs: { color: "#ff0000" } },
          { type: "bold" },
        ]),
      ],
    };
    const out = beautify(doc(heading)).content?.[0] as JSONContent;

    expect(out.content?.[0].marks).toEqual([{ type: "bold" }]);
  });

  it("removes the marks key entirely when a heading had colour and nothing else", () => {
    const heading = {
      type: "heading",
      content: [text("Titre", [{ type: "highlight", attrs: { color: "#ff0" } }])],
    };
    const out = beautify(doc(heading)).content?.[0] as JSONContent;

    expect(out.content?.[0]).not.toHaveProperty("marks");
  });

  it("leaves colour on a paragraph, where the user may well have meant it", () => {
    const coloured = {
      type: "paragraph",
      content: [text("rouge", [{ type: "textStyle", attrs: { color: "#ff0000" } }])],
    };
    expect(beautify(doc(coloured)).content?.[0]).toEqual(coloured);
  });

  it("reaches a heading nested inside a container", () => {
    const nested = {
      type: "callout",
      content: [
        {
          type: "heading",
          content: [text("Titre", [{ type: "textStyle", attrs: { color: "#f00" } }])],
        },
      ],
    };
    const out = beautify(doc(nested)).content?.[0] as JSONContent;

    expect(out.content?.[0].content?.[0]).not.toHaveProperty("marks");
  });

  it("returns anything that is not a document unchanged", () => {
    expect(beautify({ type: "paragraph" })).toEqual({ type: "paragraph" });
    expect(beautify({ type: "doc" })).toEqual({ type: "doc" });
  });

  it("does not mutate the document it was given", () => {
    const before = doc(table(row("a", "1"), row("b", "2")));
    const snapshot = structuredClone(before);
    beautify(before);
    expect(before).toEqual(snapshot);
  });

  it("is deterministic: the same input always yields the same output", () => {
    const input = doc(table(row("a", "1"), row("b", "2")));
    expect(beautify(input)).toEqual(beautify(input));
  });
});
