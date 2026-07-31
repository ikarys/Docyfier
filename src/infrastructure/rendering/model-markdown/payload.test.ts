import { describe, expect, it } from "vitest";
import { decisionNoteTemplate } from "@/domain/documents/templates/decision-note";
import { incidentPostmortemTemplate } from "@/domain/documents/templates/incident-postmortem";
import { meetingNotesTemplate } from "@/domain/documents/templates/meeting-notes";
import { projectOnePagerTemplate } from "@/domain/documents/templates/project-one-pager";
import { roadmapTemplate } from "@/domain/documents/templates/roadmap";
import { statusReportTemplate } from "@/domain/documents/templates/status-report";
import { techSpecTemplate } from "@/domain/documents/templates/tech-spec";
import { nodeText, type DocumentBody, type DocumentNode } from "@/domain/documents/body";
import { blocksToModelMarkdown } from "./emit";
import { modelMarkdownToBlocks } from "./parse";

/**
 * What the format is for, measured on documents someone actually wrote.
 *
 * The fixtures prove nothing is lost; they prove nothing about cost, because
 * they are a catalogue of every block rather than a document. The seven
 * templates are real: headings, prose, tables, cards, stats, a chart. Measured
 * here, ProseMirror JSON is 4.94x the visible text — which is the tax STEP U14
 * exists to stop paying, in the prompt and in the answer both.
 */

const TEMPLATES: DocumentBody[] = [
  meetingNotesTemplate,
  projectOnePagerTemplate,
  techSpecTemplate,
  statusReportTemplate,
  roadmapTemplate,
  incidentPostmortemTemplate,
  decisionNoteTemplate,
].map((template) => template.content);

const size = (pick: (body: DocumentBody) => number) =>
  TEMPLATES.reduce((total, body) => total + pick(body), 0);

const asJson = size((body) => JSON.stringify(body).length);
const asText = size((body) => nodeText(body).length);
const asMarkdown = size((body) => blocksToModelMarkdown((body.content ?? []) as DocumentNode[]).length);

describe("what a real document costs a model", () => {
  it("carries the same documents in about a third of the characters", () => {
    // Measured: 26 865 characters of JSON against 9 444 of model markdown.
    expect(asMarkdown / asJson).toBeLessThan(0.45);
  });

  it("stays close to the words themselves, where JSON was five times them", () => {
    expect(asJson / asText).toBeGreaterThan(4);
    expect(asMarkdown / asText).toBeLessThan(2);
  });

  /**
   * The escape hatch is exact but costs what JSON costs. Not one of these
   * documents needs it, which is what makes the ratio above the real one.
   */
  it("needs the JSON escape hatch for none of them", () => {
    for (const body of TEMPLATES) {
      const written = blocksToModelMarkdown((body.content ?? []) as DocumentNode[]);
      expect(written).not.toContain("::: json");
    }
  });

  it("gives every one of them back block for block", () => {
    for (const body of TEMPLATES) {
      const blocks = (body.content ?? []) as DocumentNode[];
      expect(modelMarkdownToBlocks(blocksToModelMarkdown(blocks))).toHaveLength(blocks.length);
    }
  });
});
