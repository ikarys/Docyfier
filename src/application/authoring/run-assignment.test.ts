import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import type { Assignment } from "@/domain/authoring/agents/routing";
import type { DocumentNode } from "@/domain/documents/body";
import { runAssignment } from "./run-assignment";

function paragraph(text: string): DocumentNode {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

function doc(...blocks: DocumentNode[]): string {
  return JSON.stringify({ type: "doc", content: blocks });
}

const PASSAGE = [
  paragraph("Vendor A costs 120k a year. Vendor B costs 90k a year."),
];

const WRITER: Assignment = { steps: ["writer"], reason: "Rewriting the words" };
const DESIGNER: Assignment = { steps: ["designer"], reason: "Laying out" };
const BOTH: Assignment = { steps: ["writer", "designer"], reason: "Rewriting, then laying out" };

describe("runAssignment", () => {
  it("hands back what the assistant produced", async () => {
    const generator = new ScriptedGenerator([doc(paragraph("Vendor A: 120k. Vendor B: 90k."))]);

    const result = await runAssignment(authoringDeps(generator), WRITER, PASSAGE, "Shorten it");

    expect(result.ran).toEqual(["writer"]);
    expect(result.blocks).toHaveLength(1);
  });

  it("asks each assistant at its own temperature", async () => {
    const generator = new ScriptedGenerator([doc(paragraph("Vendor A 120k Vendor B 90k"))]);

    await runAssignment(authoringDeps(generator), DESIGNER, PASSAGE, "Lay it out");

    expect(generator.requests[0]?.temperature).toBe(0.1);
  });

  /** The point of the order: the layout assistant arranges the words the writer
   * settled on, not the ones it replaced. */
  it("feeds each assistant what the one before it produced", async () => {
    const generator = new ScriptedGenerator([
      doc(paragraph("Vendor A costs 120k. Vendor B costs 90k.")),
      doc(paragraph("Vendor A 120k Vendor B 90k")),
    ]);

    const result = await runAssignment(authoringDeps(generator), BOTH, PASSAGE, "Tidy this up");

    expect(generator.requests[1]?.prompt).toContain("Vendor A costs 120k.");
    expect(result.ran).toEqual(["writer", "designer"]);
  });

  it("re-asks the layout assistant when it rewrote the passage", async () => {
    const generator = new ScriptedGenerator([
      doc(paragraph("Vendor A is by far the wisest choice for a team of this size and budget.")),
      doc(paragraph("Vendor A 120k Vendor B 90k")),
    ]);

    const result = await runAssignment(authoringDeps(generator), DESIGNER, PASSAGE, "Lay it out");

    expect(generator.requests).toHaveLength(2);
    expect(generator.requests[1]?.prompt).toMatch(/changed the text/i);
    expect(result.refused).toEqual([]);
  });

  it("re-asks the writer when it reached for a layout block", async () => {
    const table: DocumentNode = {
      type: "table",
      content: [{ type: "tableRow", content: [{ type: "tableCell", content: [paragraph("A")] }] }],
    };
    const generator = new ScriptedGenerator([
      doc(table),
      doc(paragraph("Vendor A costs 120k. Vendor B costs 90k.")),
    ]);

    await runAssignment(authoringDeps(generator), WRITER, PASSAGE, "Shorten it");

    expect(generator.requests[1]?.prompt).toMatch(/layout assistant/i);
  });

  /** A layout pass that will not stop rewriting costs its own work. What the
   * writer produced is a complete answer and the user keeps it. */
  it("drops a layout step that drifted twice and keeps the writing", async () => {
    const rewritten = "Vendor A is the wisest choice for a team of this size, by a wide margin.";
    const generator = new ScriptedGenerator([
      doc(paragraph("Vendor A costs 120k. Vendor B costs 90k.")),
      doc(paragraph(rewritten)),
      doc(paragraph(rewritten)),
    ]);

    const result = await runAssignment(authoringDeps(generator), BOTH, PASSAGE, "Tidy this up");

    expect(result.ran).toEqual(["writer"]);
    expect(result.refused[0]?.agent).toBe("designer");
    expect(result.blocks[0]).toEqual(paragraph("Vendor A costs 120k. Vendor B costs 90k."));
  });

  it("fails the request when the first assistant cannot answer at all", async () => {
    const generator = new ScriptedGenerator(["not json", "still not json"]);

    await expect(
      runAssignment(authoringDeps(generator), WRITER, PASSAGE, "Shorten it"),
    ).rejects.toThrow();
  });

  it("refuses an answer that emptied the passage", async () => {
    const generator = new ScriptedGenerator([doc(), doc(paragraph("Vendor A: 120k, B: 90k."))]);

    await runAssignment(authoringDeps(generator), WRITER, PASSAGE, "Shorten it");

    expect(generator.requests[1]?.prompt).toMatch(/nothing/i);
  });
});
