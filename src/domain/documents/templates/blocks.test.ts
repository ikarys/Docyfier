import { describe, expect, it } from "vitest";
import {
  badge,
  bullets,
  callout,
  cardGrid,
  code,
  columns,
  cover,
  doc,
  h,
  numbered,
  p,
  statRow,
  steps,
  table,
  text,
  timeline,
} from "./blocks";

describe("inline blocks", () => {
  it("leaves a plain string unmarked", () => {
    expect(text("hello")).toEqual({ type: "text", text: "hello" });
  });

  it("carries a badge as a mark on the text it labels", () => {
    expect(badge("At risk", "yellow")).toEqual({
      type: "text",
      text: "At risk",
      marks: [{ type: "badge", attrs: { variant: "yellow" } }],
    });
  });

  it("accepts strings and inline nodes side by side in a paragraph", () => {
    expect(p("status: ", badge("Done", "green"))).toEqual({
      type: "paragraph",
      content: [
        { type: "text", text: "status: " },
        {
          type: "text",
          text: "Done",
          marks: [{ type: "badge", attrs: { variant: "green" } }],
        },
      ],
    });
  });
});

describe("cover", () => {
  it("opens on the title, then the subtitle and the meta line", () => {
    const node = cover("Title", "Subtitle", "Author · Date");

    expect(node.type).toBe("docCover");
    expect(node.content?.map((child) => child.type)).toEqual([
      "heading",
      "coverLine",
      "coverLine",
    ]);
    expect(node.content?.[0].attrs).toEqual({ level: 1 });
    expect(node.content?.[1].attrs).toEqual({ variant: "subtitle" });
    expect(node.content?.[2].attrs).toEqual({ variant: "meta" });
  });
});

describe("lists", () => {
  it("wraps every bullet in a list item holding a paragraph", () => {
    expect(bullets("one", "two")).toEqual({
      type: "bulletList",
      content: [
        { type: "listItem", content: [p("one")] },
        { type: "listItem", content: [p("two")] },
      ],
    });
  });

  it("numbers an ordered list the same way", () => {
    expect(numbered("first").type).toBe("orderedList");
  });

  it("hands a callout its variant and the blocks it wraps", () => {
    const node = callout("warn", p("careful"));

    expect(node).toEqual({
      type: "callout",
      attrs: { variant: "warn" },
      content: [p("careful")],
    });
  });
});

describe("stat rows", () => {
  it("falls back to a flat blue stat and omits the icon when none is named", () => {
    const row = statRow("row", { value: "42", label: "Answers" });

    expect(row.content?.[0].attrs).toEqual({
      accent: "blue",
      trend: "flat",
      layout: "row",
    });
    expect(row.content?.[0].content).toEqual([p("42"), p("Answers")]);
  });

  it("adds the delta as a third line only when the stat states one", () => {
    const row = statRow("grid", {
      value: "82%",
      label: "Delivered",
      delta: "+12 pts",
      accent: "green",
      trend: "good",
      icon: "check",
    });

    expect(row.content?.[0].attrs).toEqual({
      accent: "green",
      trend: "good",
      layout: "grid",
      icon: "check",
    });
    expect(row.content?.[0].content).toHaveLength(3);
  });
});

describe("card grids", () => {
  it("lays out one column per card", () => {
    const grid = cardGrid(
      { title: "One", body: "first" },
      { title: "Two", body: "second", accent: "blue", icon: "star" },
    );

    expect(grid.attrs).toEqual({ cols: 2 });
    expect(grid.content?.[0].attrs).toEqual({ accent: "none" });
    expect(grid.content?.[1].attrs).toEqual({ accent: "blue", icon: "star" });
    expect(grid.content?.[0].content).toEqual([h(3, "One"), p("first")]);
  });
});

describe("timelines and steps", () => {
  it("puts the moment before the title of a timeline item", () => {
    const line = timeline({ when: "Q1", title: "Foundations", body: "groundwork" });

    expect(line.content?.[0].attrs).toEqual({ accent: "blue" });
    expect(line.content?.[0].content).toEqual([
      p("Q1"),
      h(3, "Foundations"),
      p("groundwork"),
    ]);
  });

  it("opens a step on its title", () => {
    const list = steps({ title: "Ship", body: "dark", accent: "green" });

    expect(list.type).toBe("stepList");
    expect(list.content?.[0].attrs).toEqual({ accent: "green" });
    expect(list.content?.[0].content).toEqual([h(3, "Ship"), p("dark")]);
  });

  it("stands two columns side by side", () => {
    const node = columns([h(3, "Left")], [h(3, "Right")]);

    expect(node.type).toBe("columnList");
    expect(node.content).toEqual([
      { type: "column", content: [h(3, "Left")] },
      { type: "column", content: [h(3, "Right")] },
    ]);
  });
});

describe("tables", () => {
  it("makes the first row the header and the rest cells", () => {
    const node = table(["Action", "Owner"], ["Write it up", "Name"]);

    expect(node.content?.[0].content?.every((c) => c.type === "tableHeader")).toBe(true);
    expect(node.content?.[1].content?.every((c) => c.type === "tableCell")).toBe(true);
  });

  it("wraps an inline node in a paragraph so a cell always holds a block", () => {
    const node = table(["Status"], [badge("Done", "green")]);

    expect(node.content?.[1].content?.[0].content).toEqual([
      { type: "paragraph", content: [badge("Done", "green")] },
    ]);
  });
});

describe("code and document", () => {
  it("tags a code block with the language it is written in", () => {
    expect(code("typescript", "const a = 1;")).toEqual({
      type: "codeBlock",
      attrs: { language: "typescript" },
      content: [text("const a = 1;")],
    });
  });

  it("wraps blocks into a document body", () => {
    expect(doc(p("only"))).toEqual({ type: "doc", content: [p("only")] });
  });
});
