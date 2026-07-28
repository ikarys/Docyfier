import { describe, expect, it } from "vitest";
import { editorSchema } from "@/infrastructure/editor/schema";
import { pastedTable } from "./pasted-table";

describe("a spreadsheet range become a table", () => {
  it("names the columns with the first row", () => {
    const table = pastedTable(editorSchema, [
      ["Region", "Revenue"],
      ["EMEA", "120"],
    ]);

    expect(table.child(0).child(0).type.name).toBe("tableHeader");
    expect(table.child(1).child(0).type.name).toBe("tableCell");
    expect(table.textContent).toBe("RegionRevenueEMEA120");
  });

  it("keeps the shape of the range", () => {
    const table = pastedTable(editorSchema, [
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);

    expect(table.childCount).toBe(2);
    expect(table.child(0).childCount).toBe(3);
  });

  it("leaves an empty cell empty rather than dropping it", () => {
    const table = pastedTable(editorSchema, [
      ["a", ""],
      ["", "d"],
    ]);

    expect(table.child(0).childCount).toBe(2);
    expect(table.child(0).child(1).textContent).toBe("");
  });

  it("builds a table the schema accepts", () => {
    const table = pastedTable(editorSchema, [
      ["a", "b"],
      ["c", "d"],
    ]);

    expect(() => editorSchema.node("doc", null, [table]).check()).not.toThrow();
  });
});
