"use client";

import type { Editor } from "@tiptap/react";

/**
 * The table controls, shown only while the caret sits inside a table
 * (PLAN.md STEP U8). Every command already ships with the table extension; a
 * bar that offers three of them is what made tables feel unfinished.
 *
 * Column alignment is not here on purpose: selecting a column and using the
 * alignment buttons of the selection bar applies to every cell at once, so the
 * rule keeps one home.
 */

interface TableCommand {
  readonly label: string;
  readonly title: string;
  readonly run: (editor: Editor) => boolean;
  readonly can: (editor: Editor) => boolean;
}

const ROW_COMMANDS: TableCommand[] = [
  {
    label: "+Row",
    title: "Insert row below",
    run: (editor) => editor.chain().focus().addRowAfter().run(),
    can: (editor) => editor.can().addRowAfter(),
  },
  {
    label: "−Row",
    title: "Delete row",
    run: (editor) => editor.chain().focus().deleteRow().run(),
    can: (editor) => editor.can().deleteRow(),
  },
];

const COLUMN_COMMANDS: TableCommand[] = [
  {
    label: "+Col",
    title: "Insert column after",
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
    can: (editor) => editor.can().addColumnAfter(),
  },
  {
    label: "−Col",
    title: "Delete column",
    run: (editor) => editor.chain().focus().deleteColumn().run(),
    can: (editor) => editor.can().deleteColumn(),
  },
];

const CELL_COMMANDS: TableCommand[] = [
  {
    label: "Header",
    title: "Toggle the header row",
    run: (editor) => editor.chain().focus().toggleHeaderRow().run(),
    can: (editor) => editor.can().toggleHeaderRow(),
  },
  {
    label: "Merge",
    title: "Merge the selected cells",
    run: (editor) => editor.chain().focus().mergeCells().run(),
    can: (editor) => editor.can().mergeCells(),
  },
  {
    label: "Split",
    title: "Split the merged cell",
    run: (editor) => editor.chain().focus().splitCell().run(),
    can: (editor) => editor.can().splitCell(),
  },
  {
    label: "✕Tbl",
    title: "Delete table",
    run: (editor) => editor.chain().focus().deleteTable().run(),
    can: (editor) => editor.can().deleteTable(),
  },
];

export function TableGroup({ editor }: { editor: Editor }) {
  return (
    <>
      {[ROW_COMMANDS, COLUMN_COMMANDS, CELL_COMMANDS].map((group, index) => (
        <div className="tb-group" key={index}>
          {group.map((command) => (
            <button
              key={command.label}
              className="tb-btn"
              onClick={() => command.run(editor)}
              disabled={!command.can(editor)}
              title={command.title}
            >
              {command.label}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
