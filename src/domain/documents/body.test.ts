import { describe, expect, it } from "vitest";
import {
  blocksOf,
  copyBody,
  documentBody,
  emptyBody,
  nodeText,
  titleHeading,
} from "./body";

const text = (value: string) => ({ type: "text", text: value });
const heading = (value: string, level = 1) => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});
const p = (value: string) => ({ type: "paragraph", content: [text(value)] });
const doc = (...content: object[]) => ({ type: "doc", content });

describe("emptyBody", () => {
  it("is a document the editor can put a caret in", () => {
    expect(emptyBody()).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("returns a fresh object, so two documents never share a body", () => {
    expect(emptyBody()).not.toBe(emptyBody());
  });
});

/** Nothing downstream may meet a body it has to repair. */
describe("documentBody", () => {
  it("passes a well-formed body through unchanged", () => {
    const body = doc(p("Bonjour"));
    expect(documentBody(body)).toBe(body);
  });

  it("repairs what a client or a driver can send instead of a body", () => {
    expect(documentBody(null)).toEqual(emptyBody());
    expect(documentBody(undefined)).toEqual(emptyBody());
    expect(documentBody("<p>Bonjour</p>")).toEqual(emptyBody());
    expect(documentBody({ type: "paragraph" })).toEqual(emptyBody());
    expect(documentBody({ type: "doc" })).toEqual(emptyBody());
  });

  it("repairs a document with no blocks, which the editor refuses to render", () => {
    expect(documentBody({ type: "doc", content: [] })).toEqual(emptyBody());
  });
});

describe("nodeText", () => {
  it("returns the text of a text node", () => {
    expect(nodeText(text("Bonjour"))).toBe("Bonjour");
  });

  it("concatenates nested content without inserting separators", () => {
    expect(nodeText({ type: "paragraph", content: [text("Rapport "), text("2026")] }))
      .toBe("Rapport 2026");
  });

  it("returns an empty string for a node that holds no text", () => {
    expect(nodeText({ type: "horizontalRule" })).toBe("");
  });

  it("keeps an empty text node's own value rather than falling through", () => {
    expect(nodeText({ type: "text", text: "", content: [text("x")] })).toBe("");
  });
});

describe("titleHeading", () => {
  it("finds the first heading, whatever its level", () => {
    expect(titleHeading(doc(p("intro"), heading("Titre", 3)))).toEqual(
      heading("Titre", 3),
    );
  });

  it("looks inside the cover block that carries the title", () => {
    const cover = {
      type: "docCover",
      content: [{ type: "coverLine", content: [text("sur-titre")] }, heading("Le titre")],
    };
    expect(titleHeading(doc(cover))).toEqual(heading("Le titre"));
  });

  it("does not descend into anything else, where a heading is not the title", () => {
    const callout = { type: "callout", content: [heading("Pas le titre")] };
    expect(titleHeading(doc(callout))).toBeUndefined();
  });

  it("returns undefined when there is no heading", () => {
    expect(titleHeading(doc(p("juste du texte")))).toBeUndefined();
    expect(titleHeading({ type: "doc" })).toBeUndefined();
  });
});

describe("blocksOf", () => {
  it("returns the top-level blocks every whole-document edit addresses", () => {
    expect(blocksOf(doc(p("un"), p("deux")))).toHaveLength(2);
    expect(blocksOf({ type: "doc" })).toEqual([]);
  });
});

describe("copyBody", () => {
  it("copies deeply, so editing one body never reaches the other", () => {
    const body = doc(p("un"));
    const copy = copyBody(body);

    expect(copy).toEqual(body);
    expect(copy).not.toBe(body);
    expect(copy.content?.[0]).not.toBe(body.content[0]);
  });
});
