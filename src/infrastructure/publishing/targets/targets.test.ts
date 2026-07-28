import { describe, expect, it } from "vitest";
import type { DocumentNode } from "@/domain/documents/body";
import { confluenceTarget } from "./confluence";
import { notionTarget } from "./notion";
import { triliumTarget } from "./trilium";
import type { ExportDocument } from "@/domain/publishing/export-target";

const doc = (...content: DocumentNode[]): ExportDocument => ({
  title: "Rapport & bilan",
  content: { type: "doc", content },
});

const p = (value: string) => ({
  type: "paragraph",
  content: [{ type: "text", text: value }],
});

const render = (target: typeof notionTarget, source: ExportDocument, values = {}) =>
  target.render(source, values) as string;

/** What each target does differently — the shared walk is covered elsewhere. */
describe("notionTarget", () => {
  it("emits markdown, which is what Notion's paste handler reads", () => {
    expect(render(notionTarget, doc({ type: "heading", content: [{ type: "text", text: "Titre" }] })))
      .toContain("# Titre");
  });

  it("leaves the title out by default: Notion names the page after the first heading", () => {
    expect(render(notionTarget, doc(p("corps")))).not.toContain("Rapport & bilan");
  });

  it("prepends the title when the option asks for it", () => {
    expect(render(notionTarget, doc(p("corps")), { titleHeading: "on" })).toMatch(
      /^# Rapport & bilan\n\n/,
    );
  });
});

describe("triliumTarget", () => {
  it("emits an HTML fragment, which is what a text note stores", () => {
    const out = render(triliumTarget, doc(p("corps")));
    expect(out).toContain("<p>corps</p>");
    expect(out).not.toContain("<!doctype html>");
  });

  it("wraps the fragment in a page whose title names the imported note", () => {
    const out = render(triliumTarget, doc(p("corps")), { document: "on" });
    expect(out).toContain("<!doctype html>");
    expect(out).toContain("<title>Rapport &amp; bilan</title>");
  });
});

describe("confluenceTarget", () => {
  const callout = {
    type: "callout",
    attrs: { variant: "warn" },
    content: [p("attention")],
  };
  const code = {
    type: "codeBlock",
    attrs: { language: "ts" },
    content: [{ type: "text", text: "const a = 1;" }],
  };

  it("emits semantic HTML in the rich flavour, the only one Cloud accepts", () => {
    const out = render(confluenceTarget, doc(callout), { format: "rich" });
    expect(out).not.toContain("ac:structured-macro");
  });

  it("emits the macros that make a callout a real panel in the storage flavour", () => {
    const out = render(confluenceTarget, doc(callout), { format: "storage" });
    expect(out).toContain('ac:name="note"');
    expect(out).toContain("ac:rich-text-body");
  });

  it("puts code in the code macro rather than in a pre block", () => {
    const out = render(confluenceTarget, doc(code), { format: "storage" });
    expect(out).toContain('ac:name="code"');
    expect(out).toContain("const a = 1;");
  });

  it("keeps the CDATA valid when the code itself closes one", () => {
    const hostile = {
      type: "codeBlock",
      content: [{ type: "text", text: "a ]]> b" }],
    };
    const out = render(confluenceTarget, doc(hostile), { format: "storage" });
    expect(out).not.toContain("a ]]> b");
    expect(out).toContain("]]]]><![CDATA[>");
  });
});
