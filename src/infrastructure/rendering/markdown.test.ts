import { describe, expect, it } from "vitest";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import type { JSONContent } from "@tiptap/core";
import { docToMarkdown, markdownFilename } from "./markdown";

const text = (value: string, marks?: JSONContent["marks"]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: JSONContent[]) => ({ type: "paragraph", content });
const item = (value: string) => ({ type: "listItem", content: [p(text(value))] });
const cell = (value: string) => ({ type: "tableCell", content: [p(text(value))] });
const row = (...values: string[]) => ({ type: "tableRow", content: values.map(cell) });

/** The trailing newline is part of the contract; the tests read better without it. */
const md = (...content: JSONContent[]) =>
  docToMarkdown({ type: "doc", content }).replace(/\n$/, "");

describe("docToMarkdown", () => {
  it("ends the document with exactly one newline", () => {
    expect(docToMarkdown({ type: "doc", content: [p(text("x"))] })).toBe("x\n");
  });

  it("maps heading levels onto hashes and clamps what markdown cannot express", () => {
    expect(md({ type: "heading", attrs: { level: 2 }, content: [text("Titre")] })).toBe(
      "## Titre",
    );
    expect(md({ type: "heading", attrs: { level: 9 }, content: [text("T")] })).toBe(
      "###### T",
    );
    expect(md({ type: "heading", content: [text("T")] })).toBe("# T");
  });

  it("writes a task list the way markdown writes one", () => {
    const task = (value: string, checked: boolean) => ({
      type: "taskItem",
      attrs: { checked },
      content: [p(text(value))],
    });

    expect(md({ type: "taskList", content: [task("done", true), task("todo", false)] })).toBe(
      "- [x] done\n- [ ] todo",
    );
  });

  it("opens a collapsible section: an export hides nothing", () => {
    const details = {
      type: "details",
      content: [
        { type: "detailsSummary", content: [text("Details")] },
        { type: "detailsContent", content: [p(text("body"))] },
      ],
    };

    expect(md(details)).toBe("**Details**\n\nbody");
  });

  it("writes maths as the dollars every markdown reader knows", () => {
    expect(md({ type: "blockMath", attrs: { latex: "e = mc^2" } })).toBe("$$\ne = mc^2\n$$");
    expect(
      md(p(text("mass "), { type: "inlineMath", attrs: { latex: "m_0" } })),
    ).toBe("mass $m_0$");
  });

  it("renders the marks markdown has", () => {
    expect(md(p(text("gras", [{ type: "bold" }])))).toBe("**gras**");
    expect(md(p(text("ital", [{ type: "italic" }])))).toBe("*ital*");
    expect(md(p(text("barré", [{ type: "strike" }])))).toBe("~~barré~~");
    expect(md(p(text("x = 1", [{ type: "code" }])))).toBe("`x = 1`");
  });

  it("falls back to the tags markdown passes through for sub- and superscript", () => {
    expect(md(p(text("2", [{ type: "subscript" }])))).toBe("<sub>2</sub>");
    expect(md(p(text("2", [{ type: "superscript" }])))).toBe("<sup>2</sup>");
  });

  it("renders a badge as bold, the only emphasis markdown offers it", () => {
    expect(md(p(text("P1", [{ type: "badge" }])))).toBe("**P1**");
  });

  it("keeps a code span verbatim, since no mark can nest inside it", () => {
    expect(md(p(text("a*b*c", [{ type: "code" }])))).toBe("`a*b*c`");
  });

  it("escapes the characters markdown would otherwise interpret", () => {
    expect(md(p(text("2 * 3 _ 4 [5]")))).toBe("2 \\* 3 \\_ 4 \\[5\\]");
  });

  it("renders a link around its already-escaped text", () => {
    const link = [{ type: "link", attrs: { href: "https://example.com" } }];
    expect(md(p(text("le site", link)))).toBe("[le site](https://example.com)");
  });

  it("separates blocks with a blank line and drops the empty ones", () => {
    expect(md(p(text("un")), { type: "pageBreak" }, p(text("deux")))).toBe(
      "un\n\ndeux",
    );
  });

  it("keeps list markers and aligns continuation lines under them", () => {
    expect(md({ type: "bulletList", content: [item("un"), item("deux")] })).toBe(
      "- un\n- deux",
    );
    expect(md({ type: "orderedList", content: [item("un"), item("deux")] })).toBe(
      "1. un\n2. deux",
    );
  });

  it("prefixes every line of a blockquote", () => {
    const quote = { type: "blockquote", content: [p(text("un")), p(text("deux"))] };
    expect(md(quote)).toBe("> un\n>\n> deux");
  });

  it("fences a code block and leaves its content unescaped", () => {
    const block = {
      type: "codeBlock",
      attrs: { language: "ts" },
      content: [text("const a = [1, 2];")],
    };
    expect(md(block)).toBe("```ts\nconst a = [1, 2];\n```");
  });

  it("fences a code block with no language too", () => {
    expect(md({ type: "codeBlock", content: [text("plain")] })).toBe("```\nplain\n```");
  });

  it("gives a table the separator row that makes it a table", () => {
    expect(md({ type: "table", content: [row("a", "b"), row("c", "d")] })).toBe(
      "| a | b |\n| --- | --- |\n| c | d |",
    );
  });

  it("pads a ragged table to its widest row", () => {
    expect(md({ type: "table", content: [row("a", "b"), row("c")] })).toBe(
      "| a | b |\n| --- | --- |\n| c |  |",
    );
  });

  it("escapes a pipe inside a cell, which would otherwise split the column", () => {
    expect(md({ type: "table", content: [row("a|b")] })).toBe(
      "| a\\|b |\n| --- |",
    );
  });

  it("turns a callout into the GitHub alert closest to its variant", () => {
    const callout = {
      type: "callout",
      attrs: { variant: "danger" },
      content: [p(text("attention"))],
    };
    expect(md(callout)).toBe("> [!CAUTION]\n> attention");
  });

  it("falls back to a note for a variant markdown does not know", () => {
    const callout = { type: "callout", attrs: { variant: "?" }, content: [p(text("x"))] };
    expect(md(callout)).toBe("> [!NOTE]\n> x");
  });

  it("keeps a chart's data as the table it always was", () => {
    const chart = {
      type: "chart",
      attrs: {
        kind: "bar",
        title: "Ventes",
        caption: "en k€",
        categories: ["Q1", "Q2"],
        series: [{ label: "2026", values: [10, 20] }],
      },
    };
    expect(md(chart)).toBe(
      "**Ventes**\n\n|  | Q1 | Q2 |\n| --- | --- | --- |\n| **2026** | 10 | 20 |\n\n*en k€*",
    );
  });

  it("keeps a diagram's relations when it cannot keep the drawing", () => {
    const diagram = { type: "diagram", attrs: sampleDiagram("flow") };
    expect(md(diagram)).toBe(
      "- Request → Review\n- Review → Approved (yes)\n- Review → Rejected (no)",
    );
  });

  it("nests a hierarchy, which is the whole of what it says", () => {
    const diagram = { type: "diagram", attrs: sampleDiagram("hierarchy") };
    expect(md(diagram)).toBe("- Product\n  - Design\n  - Build");
  });

  it("keeps stat figures as a list rather than losing them with the layout", () => {
    const stat = {
      type: "stat",
      content: [p(text("42")), p(text("documents")), p(text("+8%"))],
    };
    expect(md({ type: "statRow", content: [stat] })).toBe(
      "- **42** — documents — +8%",
    );
  });

  it("unwraps the layout containers to the content they hold", () => {
    const grid = {
      type: "cardGrid",
      content: [{ type: "card", content: [p(text("dans une carte"))] }],
    };
    expect(md(grid)).toBe("dans une carte");
  });

  it("drops the blocks a reader of a text file would not miss", () => {
    expect(md({ type: "tableOfContents" }, { type: "pageBreak" })).toBe("");
  });

  it("renders an image as an image, inline or as a block", () => {
    expect(md({ type: "image", attrs: { src: "/a.png", alt: "schéma" } })).toBe(
      "![schéma](/a.png)",
    );
    expect(md(p({ type: "image", attrs: { src: "/a.png" } }))).toBe("![](/a.png)");
  });

  it("turns a hard break into the two trailing spaces markdown needs", () => {
    expect(md(p(text("un"), { type: "hardBreak" }, text("deux")))).toBe("un  \ndeux");
  });

  it("returns just the newline for an empty document", () => {
    expect(docToMarkdown({ type: "doc" })).toBe("\n");
  });
});

describe("markdownFilename", () => {
  it("slugs the title and appends the extension", () => {
    expect(markdownFilename("Rapport annuel 2026")).toBe("Rapport-annuel-2026.md");
  });

  it("strips accents and punctuation a filesystem would rather not see", () => {
    expect(markdownFilename("Réunion : bilan")).toBe("Reunion-bilan.md");
  });

  it("falls back to a name when the title leaves nothing", () => {
    expect(markdownFilename("///")).toBe("document.md");
  });
});
