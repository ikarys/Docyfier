"use client";

import { DOMParser as PMDOMParser, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { markdownToHtml } from "@/infrastructure/documents/source-html";
import { stripUnsupportedHtml } from "@/infrastructure/documents/untrusted-html";
import { decidePaste } from "./paste-conversion";

/**
 * Turning a decision about pasted text into document nodes (PLAN.md STEP U8).
 * What the text *is* was decided in `paste-conversion.ts`; this is the half
 * that needs a browser, kept apart so the rule stays testable without one.
 */

/** True when the paste was handled here and ProseMirror should not also act. */
export function insertPastedText(view: EditorView, clipboard: DataTransfer): boolean {
  // A clipboard carrying its own HTML is better served by ProseMirror's parser:
  // it already maps a real table or a heading onto the schema.
  if (clipboard.getData("text/html").trim() !== "") return false;

  const decision = decidePaste(clipboard.getData("text/plain"));
  if (!decision) return false;

  if (decision.kind === "table") {
    const table = tableFrom(view.state.schema, decision.rows);
    view.dispatch(view.state.tr.replaceSelectionWith(table).scrollIntoView());
    return true;
  }

  // Markdown conversion is asynchronous (the parser loads on demand), so the
  // paste is claimed now and the content lands a tick later — the same shape
  // the image paste already uses.
  void markdownToHtml(decision.source).then((html) => insertHtml(view, html));
  return true;
}

function insertHtml(view: EditorView, html: string): void {
  const holder = document.createElement("div");
  holder.innerHTML = stripUnsupportedHtml(html);
  const slice = PMDOMParser.fromSchema(view.state.schema).parseSlice(holder);
  view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
}

/** A spreadsheet range: the first row is what names the columns. */
function tableFrom(schema: Schema, rows: readonly (readonly string[])[]): PMNode {
  const cell = (text: string, type: "tableHeader" | "tableCell") =>
    schema.nodes[type].create(
      null,
      schema.nodes.paragraph.create(null, text ? schema.text(text) : null),
    );

  return schema.nodes.table.create(
    null,
    rows.map((cells, index) =>
      schema.nodes.tableRow.create(
        null,
        cells.map((text) => cell(text, index === 0 ? "tableHeader" : "tableCell")),
      ),
    ),
  );
}
