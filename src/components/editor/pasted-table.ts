import type { Node as PMNode, Schema } from "@tiptap/pm/model";

/**
 * A pasted spreadsheet range, as a table node (PLAN.md STEP U8). The first row
 * is what names the columns — a copied range carries its header, and a table
 * without one reads as data nobody labelled.
 *
 * Nodes rather than HTML: no escaping to get wrong, and the schema refuses
 * anything malformed on the spot.
 */
export function pastedTable(
  schema: Schema,
  rows: readonly (readonly string[])[],
): PMNode {
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
