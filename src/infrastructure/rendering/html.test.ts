import { describe, expect, it } from "vitest";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import type { JSONContent } from "@tiptap/core";
import { docToHtml, escapeHtml, rawText, type HtmlDialect } from "./html";

const text = (value: string, marks?: JSONContent["marks"]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const p = (...content: JSONContent[]) => ({ type: "paragraph", content });
const item = (value: string) => ({ type: "listItem", content: [p(text(value))] });
const html = (...content: JSONContent[]) => docToHtml({ type: "doc", content });

describe("escapeHtml", () => {
  it("neutralizes the characters that would otherwise be markup", () => {
    expect(escapeHtml('<img src="x" onerror=alert(1)> & co')).toBe(
      "&lt;img src=&quot;x&quot; onerror=alert(1)&gt; &amp; co",
    );
  });

  it("escapes the ampersand first, so an escape is not double-escaped", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });
});

/**
 * The shared substrate of every HTML-flavoured target. Plain semantic tags
 * only: classes and inline styles are what foreign editors throw away on paste.
 */
describe("docToHtml", () => {
  it("emits a fragment, with no wrapper element of its own", () => {
    expect(html(p(text("a")))).toBe("<p>a</p>");
  });

  it("writes a task list as a list whose state is readable anywhere", () => {
    const task = (value: string, checked: boolean) => ({
      type: "taskItem",
      attrs: { checked },
      content: [p(text(value))],
    });

    expect(html({ type: "taskList", content: [task("done", true), task("todo", false)] })).toBe(
      "<ul>\n<li>\u2611 done</li>\n<li>\u2610 todo</li>\n</ul>",
    );
  });

  it("exports a collapsible section already open", () => {
    const details = {
      type: "details",
      content: [
        { type: "detailsSummary", content: [text("More")] },
        { type: "detailsContent", content: [p(text("body"))] },
      ],
    };

    expect(html(details)).toBe("<details open><summary>More</summary><p>body</p></details>");
  });

  it("writes sub- and superscript with the tags HTML has for them", () => {
    expect(html(p(text("H"), text("2", [{ type: "subscript" }]), text("O")))).toBe(
      "<p>H<sub>2</sub>O</p>",
    );
    expect(html(p(text("m"), text("2", [{ type: "superscript" }])))).toBe(
      "<p>m<sup>2</sup></p>",
    );
  });

  it("writes maths as its source, which every tool can still read", () => {
    expect(html({ type: "blockMath", attrs: { latex: "e = mc^2" } })).toBe(
      "<p><code>$$e = mc^2$$</code></p>",
    );
    expect(html(p(text("mass "), { type: "inlineMath", attrs: { latex: "m_0" } }))).toBe(
      "<p>mass <code>$m_0$</code></p>",
    );
  });

  it("maps heading levels, falling back to h1 for a level HTML has no tag for", () => {
    expect(html({ type: "heading", attrs: { level: 2 }, content: [text("T")] })).toBe(
      "<h2>T</h2>",
    );
    expect(html({ type: "heading", attrs: { level: 9 }, content: [text("T")] })).toBe(
      "<h1>T</h1>",
    );
  });

  it("renders the marks a foreign editor is sure to keep", () => {
    expect(html(p(text("g", [{ type: "bold" }])))).toBe("<p><strong>g</strong></p>");
    expect(html(p(text("i", [{ type: "italic" }])))).toBe("<p><em>i</em></p>");
    expect(html(p(text("s", [{ type: "strike" }])))).toBe("<p><s>s</s></p>");
    expect(html(p(text("c", [{ type: "code" }])))).toBe("<p><code>c</code></p>");
    expect(html(p(text("P1", [{ type: "badge" }])))).toBe("<p><strong>P1</strong></p>");
  });

  it("escapes the text inside every mark, including a code span", () => {
    expect(html(p(text("<b>", [{ type: "code" }])))).toBe("<p><code>&lt;b&gt;</code></p>");
    expect(html(p(text("a & b")))).toBe("<p>a &amp; b</p>");
  });

  it("escapes a link href, which is attacker-controlled in an imported document", () => {
    const link = [{ type: "link", attrs: { href: '/x?a="b' } }];
    expect(html(p(text("l", link)))).toBe('<p><a href="/x?a=&quot;b">l</a></p>');
  });

  it("drops a paragraph that would render empty", () => {
    expect(html(p(), p(text("a")))).toBe("<p>a</p>");
  });

  it("renders lists as lists", () => {
    expect(html({ type: "bulletList", content: [item("un")] })).toBe(
      "<ul>\n<li><p>un</p></li>\n</ul>",
    );
    expect(html({ type: "orderedList", content: [item("un")] })).toBe(
      "<ol>\n<li><p>un</p></li>\n</ol>",
    );
  });

  it("renders a table with header cells as th", () => {
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [p(text("h"))] },
            { type: "tableCell", content: [p(text("c"))] },
          ],
        },
      ],
    };
    expect(html(table)).toBe(
      "<table><tbody><tr><th><p>h</p></th><td><p>c</p></td></tr></tbody></table>",
    );
  });

  it("keeps a merged cell merged", () => {
    const table = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [{ type: "tableCell", attrs: { colspan: 2 }, content: [p(text("c"))] }],
        },
      ],
    };
    expect(html(table)).toContain('<td colspan="2">');
  });

  it("keeps a chart's data as the table it always was", () => {
    const chart = {
      type: "chart",
      attrs: { categories: ["Q1"], series: [{ label: "2026", values: [10] }] },
    };
    expect(html(chart)).toContain("<th>Q1</th>");
    expect(html(chart)).toContain("<td>10</td>");
  });

  it("exports a diagram as the drawing itself, standing on its own", () => {
    const diagram = { type: "diagram", attrs: sampleDiagram("flow") };
    const out = html(diagram);
    expect(out).toContain("<svg xmlns=");
    expect(out).toContain("Request");
    expect(out).not.toContain("var(");
  });

  it("keeps a diagram's texts around the drawing", () => {
    const diagram = {
      type: "diagram",
      attrs: { ...sampleDiagram("flow"), title: "Parcours", caption: "v2" },
    };
    expect(html(diagram)).toContain("<p><strong>Parcours</strong></p>");
    expect(html(diagram)).toContain("<p><em>v2</em></p>");
  });

  it("leaves an image relative when no origin is configured", () => {
    const image = { type: "image", attrs: { src: "/api/uploads/a.png", alt: "schéma" } };
    expect(docToHtml({ type: "doc", content: [image] })).toBe(
      '<p><img src="/api/uploads/a.png" alt="schéma" /></p>',
    );
  });

  it("makes an image absolute for a reader outside this instance", () => {
    const image = { type: "image", attrs: { src: "/api/uploads/a.png" } };
    const out = docToHtml({ type: "doc", content: [image] }, {}, {
      baseUrl: "https://docs.example.com/",
    });
    expect(out).toContain('src="https://docs.example.com/api/uploads/a.png"');
  });

  it("leaves an already absolute image alone", () => {
    const image = { type: "image", attrs: { src: "https://cdn.example.com/a.png" } };
    const out = docToHtml({ type: "doc", content: [image] }, {}, {
      baseUrl: "https://docs.example.com",
    });
    expect(out).toContain('src="https://cdn.example.com/a.png"');
  });

  it("lets a dialect own the blocks it cares about and inherit the rest", () => {
    const dialect: HtmlDialect = {
      block: (node) => (node.type === "paragraph" ? "<custom />" : null),
    };
    const out = docToHtml(
      { type: "doc", content: [p(text("a")), { type: "heading", content: [text("T")] }] },
      dialect,
    );
    expect(out).toBe("<custom />\n<h1>T</h1>");
  });

  it("returns an empty string for an empty document", () => {
    expect(docToHtml({ type: "doc" })).toBe("");
  });
});

describe("rawText", () => {
  it("flattens a node to its text, unescaped — the caller decides how to wrap it", () => {
    const block = { type: "codeBlock", content: [text("a < b"), text(" && c")] };
    expect(rawText(block)).toBe("a < b && c");
  });
});
