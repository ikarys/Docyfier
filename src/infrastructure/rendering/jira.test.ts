import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/core";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { docToJira } from "./jira";

const text = (value: string, marks?: JSONContent["marks"]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: JSONContent[]) => ({ type: "paragraph", content });
const item = (...content: JSONContent[]) => ({ type: "listItem", content });
const jira = (...content: JSONContent[]) => docToJira({ type: "doc", content });

describe("docToJira", () => {
  it("writes headings in the h1. form Jira reads", () => {
    expect(jira({ type: "heading", attrs: { level: 2 }, content: [text("Titre")] })).toBe(
      "h2. Titre",
    );
    expect(jira({ type: "heading", attrs: { level: 9 }, content: [text("T")] })).toBe(
      "h6. T",
    );
  });

  it("renders the marks Jira has", () => {
    expect(jira(p(text("g", [{ type: "bold" }])))).toBe("*g*");
    expect(jira(p(text("c", [{ type: "code" }])))).toBe("{{c}}");
    expect(jira(p(text("P1", [{ type: "badge" }])))).toBe("*P1*");
  });

  /** A bracketed placeholder must read as text, not render as a broken link. */
  it("escapes the characters Jira reads as markup", () => {
    expect(jira(p(text("Livrer avant [date]")))).toBe("Livrer avant \\[date\\]");
    expect(jira(p(text("{noformat}")))).toBe("\\{noformat\\}");
  });

  it("leaves a monospace span verbatim, since no mark nests inside it", () => {
    expect(jira(p(text("a[b]c", [{ type: "code" }])))).toBe("{{a[b]c}}");
  });

  it("marks a list with the character that makes it one", () => {
    const bullets = { type: "bulletList", content: [item(p(text("un"))), item(p(text("deux")))] };
    expect(jira(bullets)).toBe("* un\n* deux");

    const numbers = { type: "orderedList", content: [item(p(text("un")))] };
    expect(jira(numbers)).toBe("# un");
  });

  it("nests a list by repeating the markers, the way Jira expects", () => {
    const nested = {
      type: "bulletList",
      content: [
        item(p(text("un")), {
          type: "bulletList",
          content: [item(p(text("un.a")))],
        }),
      ],
    };
    expect(jira(nested)).toBe("* un\n** un.a");
  });

  it("wraps a code block in the macro that keeps it verbatim", () => {
    const block = { type: "codeBlock", attrs: { language: "ts" }, content: [text("a[0]")] };
    expect(jira(block)).toBe("{code:ts}\na[0]\n{code}");
    expect(jira({ type: "codeBlock", content: [text("x")] })).toBe("{code}\nx\n{code}");
  });

  it("wraps a quote and a callout in their own macros", () => {
    expect(jira({ type: "blockquote", content: [p(text("cité"))] })).toBe(
      "{quote}\ncité\n{quote}",
    );
    expect(
      jira({ type: "callout", attrs: { variant: "warn" }, content: [p(text("attention"))] }),
    ).toBe("{panel:title=WARN}\nattention\n{panel}");
  });

  it("marks a header row with a double bar", () => {
    const table = {
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableHeader", content: [p(text("h"))] }] },
        { type: "tableRow", content: [{ type: "tableCell", content: [p(text("c"))] }] },
      ],
    };
    expect(jira(table)).toBe("||h||\n|c|");
  });

  it("escapes a pipe inside a cell, which would otherwise split the column", () => {
    const table = {
      type: "table",
      content: [
        { type: "tableRow", content: [{ type: "tableCell", content: [p(text("a|b"))] }] },
      ],
    };
    expect(jira(table)).toBe("|a\\|b|");
  });

  it("falls through a presentation node to the content it holds", () => {
    const grid = {
      type: "cardGrid",
      content: [{ type: "card", content: [p(text("dans une carte"))] }],
    };
    expect(jira(grid)).toBe("dans une carte");
  });

  it("separates blocks with a blank line and returns nothing for an empty document", () => {
    expect(jira(p(text("un")), p(text("deux")))).toBe("un\n\ndeux");
    expect(docToJira({ type: "doc" })).toBe("");
  });
});

/**
 * An atom has no children for the default branch to fall into, so a block like
 * this leaves nothing behind unless it is handled by name.
 */
describe("docToJira, diagrams", () => {
  it("writes a diagram's relations out rather than dropping the block", () => {
    expect(jira({ type: "diagram", attrs: sampleDiagram("flow") })).toBe(
      "* Request → Review\n* Review → Approved (yes)\n* Review → Rejected (no)",
    );
  });

  it("nests a hierarchy the way Jira nests a list", () => {
    expect(jira({ type: "diagram", attrs: sampleDiagram("hierarchy") })).toBe(
      "* Product\n** Design\n** Build",
    );
  });
});
